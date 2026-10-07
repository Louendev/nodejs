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
