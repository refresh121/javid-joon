const express = require('express');
const fs = require('fs');
const app = express();
app.use(express.json());
app.use(express.static('.')); // برای خواندن فایل index.html و فونت‌ها

// مسیر چک کردن توکن
app.post('/verify-chapter', (req, res) => {
    const { username } = req.body;
    let users = JSON.parse(fs.readFileSync('users.json'));

    if (users[username] && users[username].tokens > 0) {
        users[username].tokens -= 1; // کم کردن یک توکن برای استفاده از این چپتر
        fs.writeFileSync('users.json', JSON.stringify(users, null, 2));
        res.json({ success: true, remaining: users[username].tokens });
    } else {
        res.status(403).json({ success: false, message: "توکن شما تمام شده یا کاربر یافت نشد!" });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
