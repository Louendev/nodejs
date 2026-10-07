const BlogPost = require('../models/BlogPost.js');
module.exports = async (req, res) => {
    try {
        const blogpost = await BlogPost.findById(req.params.id).populate('userid');
        res.render('post', { blogpost });
    } catch(err) {
        res.redirect('/');
    }
}
