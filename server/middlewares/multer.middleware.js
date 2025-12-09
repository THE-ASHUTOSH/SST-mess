import multer from "multer";
import path from "path";
import crypto from "crypto";

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/uploads/')
  },
  filename: function (req, file, cb) {
    // Use cryptographically random filename to prevent path traversal attacks
    const uniqueSuffix = crypto.randomBytes(16).toString('hex');
    // Sanitize extension - only allow alphanumeric and dots
    const ext = path.extname(file.originalname).replace(/[^a-zA-Z0-9.]/g, '');
    cb(null, `${uniqueSuffix}${ext}`);
  }
});

// File filter to only allow specific file types
const fileFilter = (req, file, cb) => {
  const allowedMimes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',  // xlsx
    'application/vnd.ms-excel',  // xls
    'text/csv',  // csv
    'application/csv',
  ];
  
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only Excel and CSV files are allowed.'), false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024  // 10MB limit
  }
});

export { upload };
