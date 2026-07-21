import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { vendors } from '@/lib/db/schema';
import { requireRole } from '@/lib/auth-helper';
import { and, eq, isNull } from 'drizzle-orm';
import {
    classifyEmails,
    extractEmailsFromFile,
    isUuid,
    MAX_UPLOAD_EMAILS,
    MAX_UPLOAD_FILE_BYTES,
    monthToUtcDate,
    normalizeEmails,
    parseEmailTokens,
} from '@/lib/vendor-selection-upload';

/**
 * Dry-run for the per-vendor bulk selection upload. Parses the emails (pasted text and/or an
 * uploaded CSV/XLSX), then classifies them against DB state WITHOUT writing anything, so the
 * admin can review before committing. superAdmin only.
 *
 *   POST /api/admin/upload-vendor-selection/verify   (multipart: vendorId, month, emails?, file?)
 */
export async function POST(req: Request) {
    try {
        await requireRole(['superAdmin']);

        const formData = await req.formData();
        const vendorId = formData.get('vendorId') as string | null;
        const month = formData.get('month') as string | null;
        const emailsText = (formData.get('emails') as string | null) ?? '';
        const file = formData.get('file') as File | null;

        if (!vendorId || !isUuid(vendorId)) {
            return NextResponse.json({ success: false, message: 'A valid vendor is required' }, { status: 400 });
        }
        const forMonth = monthToUtcDate(month ?? '');
        if (!forMonth) {
            return NextResponse.json({ success: false, message: 'A valid month (YYYY-MM) is required' }, { status: 400 });
        }

        const [vendor] = await db
            .select({ id: vendors.id, name: vendors.name })
            .from(vendors)
            .where(and(eq(vendors.id, vendorId), isNull(vendors.deletedAt)));
        if (!vendor) {
            return NextResponse.json({ success: false, message: 'Vendor not found' }, { status: 404 });
        }

        if (file && file.size > MAX_UPLOAD_FILE_BYTES) {
            return NextResponse.json({ success: false, message: 'File too large (max 5 MB). Split it into smaller batches.' }, { status: 400 });
        }

        const tokens = parseEmailTokens(emailsText);
        if (file) tokens.push(...(await extractEmailsFromFile(file)));

        if (tokens.length === 0) {
            return NextResponse.json({ success: false, message: 'No emails found. Paste emails or upload a file.' }, { status: 400 });
        }
        if (tokens.length > MAX_UPLOAD_EMAILS) {
            return NextResponse.json(
                { success: false, message: `Too many emails (max ${MAX_UPLOAD_EMAILS.toLocaleString('en-US')} per upload). Please split into smaller batches.` },
                { status: 400 },
            );
        }

        const { valid, invalid } = normalizeEmails(tokens);
        const { toCreate, duplicates, notFound } = await classifyEmails({ vendorId, forMonth, emails: valid });

        return NextResponse.json({
            success: true,
            vendor,
            month,
            toCreate,
            duplicates,
            notFound,
            invalid,
            counts: {
                detected: valid.length + invalid.length,
                toCreate: toCreate.length,
                duplicates: duplicates.length,
                notFound: notFound.length,
                invalid: invalid.length,
            },
        });
    } catch (error: unknown) {
        if (error instanceof Error) {
            if (error.message === 'Unauthorized') return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
            if (error.message === 'Forbidden') return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
        }
        console.error('Vendor selection verify failed:', error);
        return NextResponse.json({ success: false, message: 'Failed to verify emails' }, { status: 500 });
    }
}
