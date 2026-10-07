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
