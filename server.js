const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// --- تنظیمات اولیه ---
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public')); // برای فایل‌های فونت و استایل
app.use(session({
    secret: 'secret-key-manga-editor-123',
    resave: false,
    saveUninitialized: true
}));

// --- دیتابیس موقت (یوزر و پسورد را اینجا تغییر دهید) ---
// هشدار: در نسخه رایگان Render با هر بار ریست شدن سرور، توکن‌ها به عدد اولیه برمی‌گردند.
const users = {
    "admin": { password: "123", tokens: 50 } // نام کاربری: admin، رمز: 123
};

// لیست صفحاتی که فعال هستند (تایمر دار)
let activeEditors = {};

// --- مسیرها (Routes) ---

// 1. صفحه لاگین
app.get('/', (req, res) => {
    if (req.session.user) {
        return res.redirect('/dashboard');
    }
    res.sendFile(path.join(__dirname, 'views', 'login.html'));
});

// 2. پردازش لاگین
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    if (users[username] && users[username].password === password) {
        req.session.user = username;
        res.redirect('/dashboard');
    } else {
        res.send('<h2 style="color:red;text-align:center;margin-top:50px;">نام کاربری یا رمز عبور اشتباه است <a href="/">برگشت</a></h2>');
    }
});

// 3. داشبورد
app.get('/dashboard', (req, res) => {
    if (!req.session.user) return res.redirect('/');
    
    const user = users[req.session.user];
    // خواندن فایل HTML داشبورد و جایگذاری تعداد توکن
    // ما اینجا ساده عمل میکنیم و فایل را میفرستیم، اما برای نمایش توکن از روش ساده زیر استفاده میکنیم:
    res.send(`
    <!DOCTYPE html>
    <html lang="fa" dir="rtl">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>داشبورد کاربری</title>
        <style>
            body { font-family: Tahoma, sans-serif; background: #f4f4f4; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
            .card { background: white; padding: 2rem; border-radius: 10px; box-shadow: 0 4px 10px rgba(0,0,0,0.1); text-align: center; width: 300px; }
            h1 { color: #333; }
            .token-box { background: #e3f2fd; color: #1565c0; padding: 10px; border-radius: 5px; margin: 20px 0; font-weight: bold; }
            .btn { display: block; width: 100%; padding: 10px; background: #28a745; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 16px; text-decoration: none; box-sizing: border-box; }
            .btn:hover { background: #218838; }
            .logout { margin-top: 10px; background: #dc3545; }
            .logout:hover { background: #c82333; }
            .note { font-size: 12px; color: #666; margin-top: 15px; text-align: justify; }
        </style>
    </head>
    <body>
        <div class="card">
            <h1>سلام ${req.session.user}</h1>
            <div class="token-box">توکن باقی‌مانده: ${user.tokens}</div>
            
            <form action="/start-session" method="POST">
                <button type="submit" class="btn">شروع ویرایش (کسر ۱ توکن)</button>
            </form>
            
            <p class="note">⚠️ با زدن دکمه بالا، ۱ توکن کسر شده و یک صفحه مخصوص شما ساخته می‌شود که فقط <b>۳۰ دقیقه</b> اعتبار دارد.</p>
            
            <a href="/logout" class="btn logout">خروج</a>
        </div>
    </body>
    </html>
    `);
});

// 4. شروع نشست (کسر توکن و ساخت لینک)
app.post('/start-session', (req, res) => {
    if (!req.session.user) return res.redirect('/');
    
    const user = users[req.session.user];
    if (user.tokens > 0) {
        user.tokens--; // کسر توکن
        
        const sessionID = uuidv4(); // ساخت شناسه یکتا
        activeEditors[sessionID] = {
            startTime: Date.now(),
            user: req.session.user
        };
        
        // هدایت به صفحه مخفی ادیتور
        res.redirect(`/editor/${sessionID}`);
    } else {
        res.send('<h2 style="color:red;text-align:center;">توکن شما تمام شده است!</h2><a href="/dashboard">برگشت</a>');
    }
});

// 5. نمایش صفحه ادیتور (با بررسی امنیتی ۳۰ دقیقه)
app.get('/editor/:id', (req, res) => {
    const sessionID = req.params.id;
    const sessionData = activeEditors[sessionID];
    
    // آیا این شناسه وجود دارد؟
    if (!sessionData) {
        return res.status(403).send('<h1 style="text-align:center;margin-top:50px;">⛔ دسترسی غیرمجاز یا لینک اشتباه است.</h1>');
    }
    
    // محاسبه زمان گذشته شده
    const now = Date.now();
    const elapsedMinutes = (now - sessionData.startTime) / 1000 / 60;
    
    if (elapsedMinutes > 30) {
        // زمان تمام شده، حذف از حافظه
        delete activeEditors[sessionID];
        return res.status(410).send('<h1 style="text-align:center;color:red;margin-top:50px;">⌛ زمان ۳۰ دقیقه‌ای شما به پایان رسیده است.</h1><p style="text-align:center"><a href="/dashboard">بازگشت به داشبورد</a></p>');
    }
    
    // همه چیز اوکی است، فایل اصلی ادیتور ارسال شود
    res.sendFile(path.join(__dirname, 'views', 'editor.html'));
});

// 6. خروج
app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
