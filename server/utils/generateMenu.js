import fs from 'fs';


const generateMenu = (filePath) => {
    const data = fs.readFileSync(filePath, 'utf8');
    const rows = data.split('\n').map(row => row.split(','));

    const menu = {};
    const days = rows[3].slice(1).map(day => day.trim().toLowerCase());

    days.forEach(day => {
        if (day) {
            menu[day] = {
                breakfast: [],
                lunch: [],
                dinner: []
            };
        }
    });

    const breakfastRows = rows.slice(4, 17);
    const lunchRows = rows.slice(17, 30);
    const dinnerRows = rows.slice(30, 43);

    days.forEach((day, dayIndex) => {
        if (day) {
            breakfastRows.forEach(row => {
                if (row[dayIndex + 1] && row[dayIndex + 1].trim()) {
                    menu[day].breakfast.push(row[dayIndex + 1].trim());
                }
            });

            lunchRows.forEach(row => {
                if (row[dayIndex + 1] && row[dayIndex + 1].trim()) {
                    menu[day].lunch.push(row[dayIndex + 1].trim());
                }
            });

            dinnerRows.forEach(row => {
                if (row[dayIndex + 1] && row[dayIndex + 1].trim()) {
                    menu[day].dinner.push(row[dayIndex + 1].trim());
                }
            });
        }
    });

    return menu;
};

export default generateMenu;