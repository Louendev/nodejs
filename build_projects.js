const fs = require('fs');
const path = require('path');

const monblogBase = 'C:\\Users\\zwaxx\\app2\\monblog';
const jwtBase = 'C:\\Users\\zwaxx\\app2\\jwt-auth-express-mysql';

const createFiles = (base, files) => {
    for (const [file, content] of Object.entries(files)) {
        const fullPath = path.join(base, file);
        fs.mkdirSync(path.dirname(fullPath), { recursive: true });
        fs.writeFileSync(fullPath, content.trim() + '\n');
    }
};

const monblogFiles = {
    "package.json": `{
  "name": "monblog",
  "version": "1.0.0",
  "main": "app.js",
  "scripts": { "start": "node app.js", "dev": "nodemon app.js" },
  "dependencies": {
    "bcrypt": "^5.1.0",
    "connect-flash": "^0.1.1",
    "ejs": "^3.1.9",
    "express": "^4.18.2",
    "express-fileupload": "^1.4.0",
    "express-session": "^1.17.3",
    "mongoose": "^7.0.3",
    "mongoose-unique-validator": "^3.1.0",
    "serverless-http": "^3.2.0"
  }
}`,
    "app.js": `
const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const fileUpload = require('express-fileupload');
const expressSession = require('express-session');
const flash = require('connect-flash');

const app = express();

mongoose.connect("mongodb://127.0.0.1:27017/newBlog", {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).catch(console.error);

app.set('view engine', 'ejs');
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
`,
    "models/BlogPost.js": `
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const BlogPostSchema = new Schema({
    title: String,
    body: String,
    userid: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    datePosted: { type: Date, default: new Date() },
    image: String
});
module.exports = mongoose.model('BlogPost', BlogPostSchema);
`,
    "models/User.js": `
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const bcrypt = require('bcrypt');
var uniqueValidator = require('mongoose-unique-validator');

const UserSchema = new Schema({
    username: { type: String, required: [true, 'Please provide username'], unique: true },
    password: { type: String, required: [true, 'Please provide password'] }
});

UserSchema.plugin(uniqueValidator);

UserSchema.pre('save', function(next) {
    const user = this;
    bcrypt.hash(user.password, 10, (error, hash) => {
        user.password = hash;
        next();
    });
});
module.exports = mongoose.model('User', UserSchema);
`,
    "controllers/home.js": `
const BlogPost = require('../models/BlogPost.js');
module.exports = async (req, res) => {
    const blogposts = await BlogPost.find({}).populate('userid');
    res.render('index', { blogposts });
}
`,
    "controllers/getPost.js": `
const BlogPost = require('../models/BlogPost.js');
module.exports = async (req, res) => {
    try {
        const blogpost = await BlogPost.findById(req.params.id).populate('userid');
        res.render('post', { blogpost });
    } catch(err) {
        res.redirect('/');
    }
}
`,
    "controllers/newPost.js": `
module.exports = (req, res) => {
    if (req.session.userId) {
        return res.render('create', { createPost: true });
    }
    res.redirect('/auth/login');
}
`,
    "controllers/storePost.js": `
const BlogPost = require('../models/BlogPost.js');
const path = require('path');
const fs = require('fs');

module.exports = (req, res) => {
    let image = req.files && req.files.image;
    if(image) {
        const uploadDir = path.resolve(__dirname, '..', 'public', 'img');
        fs.mkdirSync(uploadDir, { recursive: true });
        image.mv(path.join(uploadDir, image.name), async (error) => {
            await BlogPost.create({ ...req.body, image: '/img/' + image.name, userid: req.session.userId });
            res.redirect('/');
        });
    } else {
        res.redirect('/posts/new');
    }
}
`,
    "controllers/newUser.js": `
module.exports = (req, res) => {
    var username = "";
    var password = "";
    const data = req.flash('data')[0];
    if (typeof data != "undefined") {
        username = data.username;
        password = data.password;
    }
    res.render('register', { errors: req.flash('validationErrors'), username: username, password: password });
}
`,
    "controllers/storeUser.js": `
const User = require('../models/User.js');
module.exports = (req, res) => {
    User.create(req.body).then(user => {
        res.redirect('/');
    }).catch(error => {
        if(error.errors) {
            const validationErrors = Object.keys(error.errors).map(key => error.errors[key].message);
            req.flash('validationErrors', validationErrors);
        }
        req.flash('data', req.body);
        return res.redirect('/auth/register');
    });
}
`,
    "controllers/login.js": `
module.exports = (req, res) => { res.render('login'); }
`,
    "controllers/loginUser.js": `
const bcrypt = require('bcrypt');
const User = require('../models/User');
module.exports = (req, res) => {
    const { username, password } = req.body;
    User.findOne({ username: username }).then(user => {
        if (user) {
            bcrypt.compare(password, user.password, (error, same) => {
                if (same) { req.session.userId = user._id; res.redirect('/'); } 
                else { res.redirect('/auth/login'); }
            });
        } else { res.redirect('/auth/login'); }
    });
}
`,
    "controllers/logout.js": `
module.exports = (req, res) => {
    req.session.destroy(() => { res.redirect('/'); });
}
`,
    "middleware/ValidationMiddleware.js": `
module.exports = (req, res, next) => {
    if (req.files == null || req.body.title == null) { return res.redirect('/posts/new'); }
    next();
}
`,
    "middleware/authMiddleware.js": `
const User = require('../models/User');
module.exports = (req, res, next) => {
    User.findById(req.session.userId).then(user => {
        if (!user) { return res.redirect('/'); }
        next();
    }).catch(error => { return res.redirect('/'); });
}
`,
    "middleware/redirectIfAuthenticatedMiddleware.js": `
module.exports = (req, res, next) => {
    if (req.session.userId) { return res.redirect('/'); }
    next();
}
`,
    "views/layouts/header.ejs": `
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
    <title>Clean Blog</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet" />
    <% if(locals.createPost && createPost) { %>
        <link href="https://stackpath.bootstrapcdn.com/bootstrap/3.4.1/css/bootstrap.min.css" rel="stylesheet">
        <script src="https://code.jquery.com/jquery-3.5.1.min.js"></script>
        <script src="https://stackpath.bootstrapcdn.com/bootstrap/3.4.1/js/bootstrap.min.js"></script>
        <link href="https://cdn.jsdelivr.net/npm/summernote@0.8.18/dist/summernote.min.css" rel="stylesheet">
        <script src="https://cdn.jsdelivr.net/npm/summernote@0.8.18/dist/summernote.min.js"></script>
    <% } %>
</head>
`,
    "views/layouts/navbar.ejs": `
<nav class="navbar navbar-expand-lg navbar-light bg-light" id="mainNav">
    <div class="container px-4 px-lg-5">
        <a class="navbar-brand" href="/">Blog</a>
        <div class="collapse navbar-collapse" id="navbarResponsive">
            <ul class="navbar-nav ms-auto py-4 py-lg-0">
                <li class="nav-item"><a class="nav-link" href="/">Home</a></li>
                <% if(loggedIn) { %>
                    <li class="nav-item"><a class="nav-link" href="/posts/new">New Post</a></li>
                    <li class="nav-item"><a class="nav-link" href="/auth/logout">Logout</a></li>
                <% } else { %>
                    <li class="nav-item"><a class="nav-link" href="/auth/login">Login</a></li>
                    <li class="nav-item"><a class="nav-link" href="/auth/register">Register</a></li>
                <% } %>
            </ul>
        </div>
    </div>
</nav>
`,
    "views/layouts/footer.ejs": `
<footer class="border-top mt-5 pt-3">
    <div class="container px-4 px-lg-5">
        <div class="small text-center text-muted fst-italic">Copyright &copy; Your Website 2023</div>
    </div>
</footer>
`,
    "views/layouts/scripts.ejs": `
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js"></script>
`,
    "views/index.ejs": `
<!DOCTYPE html>
<html lang="en">
<%- include('layouts/header'); -%>
<body>
    <%- include('layouts/navbar'); -%>
    <header class="masthead bg-dark text-white text-center py-5">
        <div class="container"><h1>Clean Blog</h1><span class="subheading">A Blog Theme</span></div>
    </header>
    <div class="container mt-4">
        <% if(blogposts && blogposts.length > 0) { %>
            <% for (var i = 0; i < blogposts.length; i++){ %>
                <div class="post-preview">
                    <a href="/post/<%= blogposts[i]._id %>">
                        <h2 class="post-title"><%= blogposts[i].title %></h2>
                    </a>
                    <p class="post-meta">Posted by <%= blogposts[i].userid ? blogposts[i].userid.username : 'Unknown' %> on <%= blogposts[i].datePosted.toDateString() %></p>
                </div>
                <hr>
            <% } %>
        <% } else { %>
            <p>No posts found.</p>
        <% } %>
    </div>
    <%- include('layouts/footer'); -%>
    <%- include('layouts/scripts'); -%>
</body>
</html>
`,
    "views/post.ejs": `
<!DOCTYPE html>
<html lang="en">
<%- include('layouts/header'); -%>
<body>
    <%- include('layouts/navbar'); -%>
    <header class="masthead bg-dark text-white text-center py-5">
        <div class="container">
            <h1><%= blogpost.title %></h1>
            <span class="meta">Posted by <%= blogpost.userid ? blogpost.userid.username : 'Unknown' %> on <%= blogpost.datePosted.toDateString() %></span>
        </div>
        <% if(blogpost.image) { %>
            <img src="<%= blogpost.image %>" class="img-fluid mt-3" style="max-height: 400px;">
        <% } %>
    </header>
    <article class="mt-4">
        <div class="container">
            <%- blogpost.body %>
        </div>
    </article>
    <%- include('layouts/footer'); -%>
    <%- include('layouts/scripts'); -%>
</body>
</html>
`,
    "views/create.ejs": `
<!DOCTYPE html>
<html lang="en">
<%- include('layouts/header'); -%>
<body>
    <%- include('layouts/navbar'); -%>
    <header class="masthead bg-dark text-white text-center py-5"><div class="container"><h1>Create New Post</h1></div></header>
    <div class="container mt-4">
        <form action="/posts/store" method="POST" enctype="multipart/form-data">
            <div class="mb-3">
                <label>Title</label>
                <input type="text" class="form-control" name="title" required>
            </div>
            <div class="mb-3">
                <label>Description</label>
                <textarea class="form-control" id="body" name="body" required></textarea>
                <script>
                    $(document).ready(function() {
                        $('#body').summernote({ height: 200 });
                    });
                </script>
            </div>
            <div class="mb-3">
                <label>Image</label>
                <input type="file" class="form-control" name="image" required>
            </div>
            <button type="submit" class="btn btn-primary mt-3">Send</button>
        </form>
    </div>
    <%- include('layouts/footer'); -%>
    <%- include('layouts/scripts'); -%>
</body>
</html>
`,
    "views/register.ejs": `
<!DOCTYPE html>
<html lang="en">
<%- include('layouts/header'); -%>
<body>
    <%- include('layouts/navbar'); -%>
    <header class="masthead bg-dark text-white text-center py-5"><div class="container"><h1>Register</h1></div></header>
    <div class="container mt-4">
        <% if(errors != null && errors.length > 0) { %>
            <ul class="list-group mb-3">
                <% for(var i = 0; i < errors.length; i++){ %>
                    <li class="list-group-item list-group-item-danger"><%= errors[i] %></li>
                <% } %>
            </ul>
        <% } %>
        <form action="/users/register" method="POST">
            <div class="mb-3">
                <label>Username</label>
                <input type="text" class="form-control" name="username" value="<%= username %>" required>
            </div>
            <div class="mb-3">
                <label>Password</label>
                <input type="password" class="form-control" name="password" value="<%= password %>" required>
            </div>
            <button type="submit" class="btn btn-primary mt-3">Register</button>
        </form>
    </div>
    <%- include('layouts/footer'); -%>
    <%- include('layouts/scripts'); -%>
</body>
</html>
`,
    "views/login.ejs": `
<!DOCTYPE html>
<html lang="en">
<%- include('layouts/header'); -%>
<body>
    <%- include('layouts/navbar'); -%>
    <header class="masthead bg-dark text-white text-center py-5"><div class="container"><h1>Login</h1></div></header>
    <div class="container mt-4">
        <form action="/users/login" method="POST">
            <div class="mb-3">
                <label>Username</label>
                <input type="text" class="form-control" name="username" required>
            </div>
            <div class="mb-3">
                <label>Password</label>
                <input type="password" class="form-control" name="password" required>
            </div>
            <button type="submit" class="btn btn-primary mt-3">Login</button>
        </form>
    </div>
    <%- include('layouts/footer'); -%>
    <%- include('layouts/scripts'); -%>
</body>
</html>
`,
    "views/notfound.ejs": `
<!DOCTYPE html>
<html lang="en">
<%- include('layouts/header'); -%>
<body>
    <%- include('layouts/navbar'); -%>
    <header class="masthead bg-dark text-white text-center py-5"><div class="container"><h1>404 Page not found</h1></div></header>
    <%- include('layouts/footer'); -%>
    <%- include('layouts/scripts'); -%>
</body>
</html>
`,
    "netlify/functions/api.js": `
const serverless = require('serverless-http');
const app = require('../../app');
module.exports.handler = serverless(app);
`,
    "netlify.toml": `
[build]
  command = "npm install"
  functions = "netlify/functions"
  publish = "public"

[[redirects]]
  from = "/*"
  to = "/.netlify/functions/api/:splat"
  status = 200
`
};

const jwtFiles = {
    "package.json": `{
  "name": "jwt-auth-express-mysql",
  "version": "1.0.0",
  "main": "server.js",
  "scripts": { "start": "node server.js" },
  "dependencies": {
    "bcryptjs": "^2.4.3",
    "cors": "^2.8.5",
    "express": "^4.18.2",
    "jsonwebtoken": "^9.0.0",
    "mysql2": "^3.3.5",
    "sequelize": "^6.32.1",
    "serverless-http": "^3.2.0"
  }
}`,
    "server.js": `
const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors({ origin: "http://localhost:3000" }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const db = require('./models');
const Role = db.role;

// Uncomment this when running for the first time to create tables
/*
db.sequelize.sync({ force: true }).then(() => {
    console.log('Drop and Resync Database with { force: true }');
    initial();
});
*/

function initial() {
    Role.create({ id: 1, name: "user" }).catch(()=>{});
    Role.create({ id: 2, name: "moderator" }).catch(()=>{});
    Role.create({ id: 3, name: "admin" }).catch(()=>{});
}

app.get('/', (req, res) => {
    res.json({ message: "Bienvenu a l'application JWT AUTH EXPRESS MYSQL." });
});

require('./routes/auth.routes')(app);
require('./routes/user.routes')(app);

if (require.main === module) {
    const PORT = process.env.PORT || 8080;
    app.listen(PORT, () => {
        console.log("Server is running on port " + PORT + ".");
    });
}
module.exports = app;
`,
    "config/db.config.js": `
module.exports = {
    HOST: "localhost",
    USER: "root",
    PASSWORD: "",
    DB: "jwtauth",
    dialect: "mysql",
    pool: { max: 5, min: 0, acquire: 30000, idle: 10000 }
};
`,
    "config/auth.config.js": `
module.exports = { secret: "pascal-lamy-secret-key" };
`,
    "models/index.js": `
const config = require("../config/db.config.js");
const Sequelize = require("sequelize");
const sequelize = new Sequelize(config.DB, config.USER, config.PASSWORD, {
    host: config.HOST,
    dialect: config.dialect,
    pool: {
        max: config.pool.max,
        min: config.pool.min,
        acquire: config.pool.acquire,
        idle: config.pool.idle
    }
});

const db = {};
db.Sequelize = Sequelize;
db.sequelize = sequelize;
db.user = require("../models/user.model.js")(sequelize, Sequelize);
db.role = require("../models/role.model.js")(sequelize, Sequelize);

db.role.belongsToMany(db.user, { through: "user_roles", foreignKey: "roleId", otherKey: "userId" });
db.user.belongsToMany(db.role, { through: "user_roles", foreignKey: "userId", otherKey: "roleId" });
db.ROLES = ["user", "admin", "moderator"];

module.exports = db;
`,
    "models/user.model.js": `
module.exports = (sequelize, Sequelize) => {
    const User = sequelize.define("users", {
        username: { type: Sequelize.STRING },
        email: { type: Sequelize.STRING },
        password: { type: Sequelize.STRING }
    });
    return User;
};
`,
    "models/role.model.js": `
module.exports = (sequelize, Sequelize) => {
    const Role = sequelize.define("roles", {
        id: { type: Sequelize.INTEGER, primaryKey: true },
        name: { type: Sequelize.STRING }
    });
    return Role;
};
`,
    "middleware/authJwt.js": `
const jwt = require("jsonwebtoken");
const config = require("../config/auth.config.js");
const db = require("../models");
const User = db.user;

const verifyToken = (req, res, next) => {
    let token = req.headers["x-access-token"];
    if (!token) return res.status(403).send({ message: "No token provided!" });
    jwt.verify(token, config.secret, (err, decoded) => {
        if (err) return res.status(401).send({ message: "Unauthorized!" });
        req.userId = decoded.id;
        next();
    });
};

const isAdmin = (req, res, next) => {
    User.findByPk(req.userId).then(user => {
        user.getRoles().then(roles => {
            for (let i = 0; i < roles.length; i++) {
                if (roles[i].name === "admin") { next(); return; }
            }
            res.status(403).send({ message: "Le role Admin est necessaire!" });
            return;
        });
    });
};

const isModerator = (req, res, next) => {
    User.findByPk(req.userId).then(user => {
        user.getRoles().then(roles => {
            for (let i = 0; i < roles.length; i++) {
                if (roles[i].name === "moderator") { next(); return; }
            }
            res.status(403).send({ message: "Le role Moderateur est necessaire!" });
        });
    });
};

const isModeratorOrAdmin = (req, res, next) => {
    User.findByPk(req.userId).then(user => {
        user.getRoles().then(roles => {
            for (let i = 0; i < roles.length; i++) {
                if (roles[i].name === "moderator") { next(); return; }
                if (roles[i].name === "admin") { next(); return; }
            }
            res.status(403).send({ message: "Le role Admin ou Moderateur est necessaire!" });
        });
    });
};

module.exports = { verifyToken, isAdmin, isModerator, isModeratorOrAdmin };
`,
    "middleware/verifySignUp.js": `
const db = require("../models");
const ROLES = db.ROLES;
const User = db.user;

const checkDuplicateUsernameOrEmail = (req, res, next) => {
    User.findOne({ where: { username: req.body.username } }).then(user => {
        if (user) { res.status(400).send({ message: "Erreur! le compte utilisateur est deja existant!" }); return; }
        User.findOne({ where: { email: req.body.email } }).then(user => {
            if (user) { res.status(400).send({ message: "Erreur! l'email utilisateur est deja existante!" }); return; }
            next();
        });
    });
};

const checkRolesExisted = (req, res, next) => {
    if (req.body.roles) {
        for (let i = 0; i < req.body.roles.length; i++) {
            if (!ROLES.includes(req.body.roles[i])) {
                res.status(400).send({ message: "Erreur! le role n'existe pas = " + req.body.roles[i] });
                return;
            }
        }
    }
    next();
};

module.exports = { checkDuplicateUsernameOrEmail, checkRolesExisted };
`,
    "middleware/index.js": `
const authJwt = require("./authJwt");
const verifySignUp = require("./verifySignUp");
module.exports = { authJwt, verifySignUp };
`,
    "controllers/auth.controller.js": `
const db = require("../models");
const config = require("../config/auth.config");
const User = db.user;
const Role = db.role;
const Op = db.Sequelize.Op;
var jwt = require("jsonwebtoken");
var bcrypt = require("bcryptjs");

exports.signup = (req, res) => {
    User.create({
        username: req.body.username,
        email: req.body.email,
        password: bcrypt.hashSync(req.body.password, 8)
    }).then(user => {
        if (req.body.roles) {
            Role.findAll({ where: { name: { [Op.or]: req.body.roles } } }).then(roles => {
                user.setRoles(roles).then(() => {
                    res.send({ message: "l'utilisateur est enregistre!" });
                });
            });
        } else {
            user.setRoles([1]).then(() => {
                res.send({ message: "l'utilisateur est enregistre!" });
            });
        }
    }).catch(err => {
        res.status(500).send({ message: err.message });
    });
};

exports.signin = (req, res) => {
    User.findOne({ where: { username: req.body.username } }).then(user => {
        if (!user) return res.status(404).send({ message: "Utilisateur non trouve." });
        var passwordIsValid = bcrypt.compareSync(req.body.password, user.password);
        if (!passwordIsValid) return res.status(401).send({ accessToken: null, message: "Mot de passe incorrect!" });
        var token = jwt.sign({ id: user.id }, config.secret, { expiresIn: 86400 });
        var authorities = [];
        user.getRoles().then(roles => {
            for (let i = 0; i < roles.length; i++) {
                authorities.push("ROLE_" + roles[i].name.toUpperCase());
            }
            res.status(200).send({ id: user.id, username: user.username, email: user.email, roles: authorities, accessToken: token });
        });
    }).catch(err => {
        res.status(500).send({ message: err.message });
    });
};
`,
    "controllers/user.controller.js": `
exports.allAccess = (req, res) => { res.status(200).send("Public Content."); };
exports.userBoard = (req, res) => { res.status(200).send("User Content."); };
exports.adminBoard = (req, res) => { res.status(200).send("Admin Content."); };
exports.moderatorBoard = (req, res) => { res.status(200).send("Moderator Content."); };
`,
    "routes/auth.routes.js": `
const { verifySignUp } = require("../middleware");
const controller = require("../controllers/auth.controller");
module.exports = function(app) {
    app.use(function(req, res, next) {
        res.header("Access-Control-Allow-Headers", "x-access-token, Origin, Content-Type, Accept");
        next();
    });
    app.post("/api/auth/signup", [verifySignUp.checkDuplicateUsernameOrEmail, verifySignUp.checkRolesExisted], controller.signup);
    app.post("/api/auth/signin", controller.signin);
};
`,
    "routes/user.routes.js": `
const { authJwt } = require("../middleware");
const controller = require("../controllers/user.controller");
module.exports = function(app) {
    app.use(function(req, res, next) {
        res.header("Access-Control-Allow-Headers", "x-access-token, Origin, Content-Type, Accept");
        next();
    });
    app.get("/api/test/all", controller.allAccess);
    app.get("/api/test/user", [authJwt.verifyToken], controller.userBoard);
    app.get("/api/test/mod", [authJwt.verifyToken, authJwt.isModerator], controller.moderatorBoard);
    app.get("/api/test/admin", [authJwt.verifyToken, authJwt.isAdmin], controller.adminBoard);
};
`,
    "netlify/functions/api.js": `
const serverless = require('serverless-http');
const app = require('../../server');
module.exports.handler = serverless(app);
`,
    "netlify.toml": `
[build]
  command = "npm install"
  functions = "netlify/functions"
  publish = "."

[[redirects]]
  from = "/*"
  to = "/.netlify/functions/api/:splat"
  status = 200
`
};

createFiles(monblogBase, monblogFiles);
createFiles(jwtBase, jwtFiles);
console.log('Project scaffolding complete!');
