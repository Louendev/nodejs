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
