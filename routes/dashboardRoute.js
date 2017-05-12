/**
 * Created by colin on 4/18/2017.
 */
var express = require('express');
var passport = require('passport');
var ensureLoggedIn = require('connect-ensure-login').ensureLoggedIn();
var router = express.Router();

/* GET user profile. */
router.get('/',ensureLoggedIn, function(req, res, next) {
    res.render('dashboard', { user: req.user });
});




module.exports = router;
/**
 * Created by colin on 4/18/2017.
 */
