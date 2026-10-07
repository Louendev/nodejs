const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const fileUpload = require('express-fileupload');
const expressSession = require('express-session');
const flash = require('connect-flash');

const app = express();

require('dotenv').config();
const mongoUrl = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/newBlog';
mongoose.connect(mongoUrl, { useNewUrlParser: true, useUnifiedTopology: true, serverSelectionTimeoutMS: 2000 }).then(() => console.log('Connecté à la base de données !')).catch(err => console.error('ERREUR DE BASE DE DONNÉES : Impossible de se connecter.', err.message));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(fileUpload());
app.use(expressSession({
    secret: 'nodejs est top',
    resave: false,
    saveUninitialized: true
}));
app.use(flash());

app.use("*", (req, res, next) => {
    app.locals.loggedIn = req.session.userId;
    next();
});

const homeController = require('./controllers/home');
const newPostController = require('./controllers/newPost');
const getPostController = require('./controllers/getPost');
const storePostController = require('./controllers/storePost');
const newUserController = require('./controllers/newUser');
const storeUserController = require('./controllers/storeUser');
const loginController = require('./controllers/login');
const loginUserController = require('./controllers/loginUser');
const logoutController = require('./controllers/logout');

const validateMiddleWare = require('./middleware/ValidationMiddleware');
const authMiddleware = require('./middleware/authMiddleware');
const redirectIfAuthenticatedMiddleware = require('./middleware/redirectIfAuthenticatedMiddleware');

app.get('/', homeController);
app.get('/post/:id', getPostController);
app.get('/posts/new', authMiddleware, newPostController);
app.post('/posts/store', authMiddleware, validateMiddleWare, storePostController);
app.get('/auth/register', redirectIfAuthenticatedMiddleware, newUserController);
app.post('/users/register', redirectIfAuthenticatedMiddleware, storeUserController);
app.get('/auth/login', redirectIfAuthenticatedMiddleware, loginController);
app.post('/users/login', redirectIfAuthenticatedMiddleware, loginUserController);
app.get('/auth/logout', logoutController);

app.use((req, res) => res.render('notfound'));

if (require.main === module) {
    app.listen(3000, () => {
        console.log('App listening on port 3000');
    });
}
module.exports = app;


