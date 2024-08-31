const express = require('express');
const { Pool } = require('pg');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;
const pool = new Pool({
    connectionString: 'postgres://postgres:root@localhost:5432/mydatabase'
});
app.use(express.urlencoded({ extended: true }));
app.use(express.json()); 
app.set('views', path.join(__dirname)); 
app.set('view engine', 'ejs');

app.get('/', (req, res) => {
    res.render('login'); 
});
app.post('/login', async (req, res) => {
    const uname = req.body.username;
    const pass = req.body.password;
    const result = await pool.query('SELECT id FROM users WHERE name = $1 AND password = $2', [uname, pass]);
    if (result.rows.length > 0) {
        const userId = result.rows[0].id;
        res.redirect(`/home?userId=${userId}`);
    } else {
        res.status(401).json({ error: 'Invalid username or password' });
    }
});
app.get('/home', async (req, res) => {
    const userId = req.query.userId;
    const articlesResult = await pool.query('SELECT * FROM articles');
    const articles = articlesResult.rows;
    const notificationsResult = await pool.query('SELECT article_id, timestamp FROM notification WHERE user_id = $1', [userId]);
    const notifications = notificationsResult.rows;
    const userResult = await pool.query('SELECT name FROM users WHERE id = $1', [userId]);
    const username = userResult.rows[0].name;
    res.render('home', { username: username, articles: articles, notifications: notifications, userId: userId });
});
app.post('/update/:articleId/:action', async (req, res) => {
    const articleId = req.params.articleId;
    const action = req.params.action; 
    const userId = req.query.userId; 
    if (action === 'like') {
        await pool.query('UPDATE articles SET likes = likes + 1 WHERE id = $1', [articleId]);
        const result = await pool.query('SELECT user_id FROM articles WHERE id = $1', [articleId]);
        const authorId = result.rows[0].user_id;
        await pool.query('INSERT INTO notification (user_id, article_id, timestamp) VALUES ($1, $2, NOW())', [authorId, articleId]);
    } else if (action === 'view') {
        await pool.query('UPDATE articles SET views = views + 1 WHERE id = $1', [articleId]);
    }
    res.redirect(`/home?userId=${userId}`);
});

app.post('/signup', async (req, res) => {
    const username = req.body.username;
    const password = req.body.password;
    const email = req.body.email;
    if (!username || !password || !email) {
        return res.status(400).send('All fields are required');
    }
    await pool.query('INSERT INTO users (name, password, email) VALUES ($1, $2, $3)', [username, password, email]);
    res.redirect('/login');
});
app.post('/logout', (req, res) => {
     res.redirect('/login');
});
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
