const express = require("express");
const usersRouter = express.Router();
const { getAllUsers, getUserByUsername, createUser } = require("../db");
const { JWT_SECRET } = process.env;
const jwt = require("jsonwebtoken");

console.log(JWT_SECRET);

usersRouter.use((req, res, next) => {
  console.log("A request is being made to /users");

  next();
});

usersRouter.get("/", async (req, res, next) => {
  const users = await getAllUsers();
  res.send({
    users,
  });
  next();
});

// usersRouter.post("/login", async (req, res, next) => {
//   console.log(req.body);
//   res.end();
// });

usersRouter.post("/login", async (req, res, next) => {
  const { username, password } = req.body;

  if (!username || !password) {
    next({
      name: "MissingCredentialsError",
      message: "Please supply both a username and a password",
    });
  }

  try {
    const user = await getUserByUsername(username);
    const { id } = user;

    if (user && user.password == password) {
      const token = jwt.sign({ id, username, password }, JWT_SECRET);
      token;

      res.send({ message: "You're logged in!", token: token });
    } else {
      next(console.log("NOT logged in"), {
        name: "IncorrectCredentialsError",
        message: "Username or password is incorrect",
      });
    }
  } catch (error) {
    console.log(error);
    next(error);
  }
});

usersRouter.post("/register", async (req, res, next) => {
  const { username, password, name, location } = req.body;

  try {
    const _user = await getUserByUsername(username);

    if (_user) {
      next({
        name: "UserExistsError",
        message: "Username taken",
      });
    }

    const user = await createUser({
      username,
      password,
      name,
      location,
    });

    const token = jwt.sign(
      {
        id: user.id,
        username,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "1w",
      }
    );

    res.send({
      message: "Thank you for signing up",
      token,
    });
  } catch ({ name, message }) {
    next({ name, message });
  }
});

module.exports = usersRouter;