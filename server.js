const express = require('express');
const session = require('express-session');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// تنظیمات سشن برای امنیت و جلوگیری از ورود مستقیم به صفحات
app.use(session({
    secret: 'manga-secret-key',
    resave: false,
    saveUninitialized: true
}));

// دیتابیس فرضی (در واقعیت باید از MongoDB استفاده کنی)
let users = {
    "admin": { password: "123", tokens: 100, filesCount: 0 }
};

// میدلور برای چک کردن لاگین بودن
const checkAuth = (req, res, next) => {
    if (req.session.loggedIn) next();
    else res.redirect('/login');
};

app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'public/login.html')));

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    if (users[username] && users[username].password === password) {
        req.session.loggedIn = true;
        req.session.username = username;
        res.redirect('/dashboard');
    } else {
        res.send("رمز اشتباه است");
    }
});

app.get('/dashboard', checkAuth, (req, res) => res.sendFile(path.join(__dirname, 'public/dashboard.html')));
app.get('/editor', checkAuth, (req, res) => res.sendFile(path.join(__dirname, 'public/editor.html')));

app.listen(3000, () => console.log("Server running on port 3000"));
