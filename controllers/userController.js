const mongoose = require("mongoose");
const User = mongoose.model("User");
const sha256 = require("js-sha256");
const jwt = require("jwt-then");

exports.register = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        const emailRegex = /@gmail.com|@yahoo.com|@hotmail.com|@live.com/;

        const profileImage = req.file && req.file.path;

        if (!emailRegex.test(email)) {
            throw "Email is not supported from your domain.";
        }

        if (password.length < 6) {
            throw "Password must be at least 6 characters long.";
        }

        const userExists = await User.findOne({ email });

        if (userExists) {
            throw "User with the same email already exists.";
        }

        const user = new User({
            name,
            email,
            password: sha256(password + process.env.SALT),
            profileImage,
        });

        await user.save();

        res.json({
            message: `User [${name}] registered successfully!`,
        });
    } catch (error) {
        console.error("Error during registration:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({
            email,
            password: sha256(password + process.env.SALT),
        });

        if (!user) {
            throw "Email and Password did not match.";
        }

        const token = await jwt.sign({ id: user.id }, process.env.SECRET);

        res.json({
            message: "User logged in successfully!",
            token,
        });
    } catch (error) {
        console.error("Error during login:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};
