const express = require("express");
const { getAllTags, getPostsByTagName } = require("../db");

const tagsRouter = express.Router();

tagsRouter.use((req, res, next) => {
  console.log("Request to tagsRouter");

  next();
});

tagsRouter.get("/", async (req, res, next) => {
  const tags = await getAllTags();

  res.send({ tags });
});

tagsRouter.get("/:tagName/posts", async (req, res, next) => {
  const { tagName } = req.params;
  try {
    const allTaggedPosts = await getPostsByTagName(tagName);

    const taggedPosts = allTaggedPosts.filter((post) => {
      if (post.active) {
        return true;
      }

      if (req.user && post.author.id === req.user.id) {
        return true;
      }

      return false;
    });

    res.send({ taggedPosts });
    if (!taggedPosts) {
      next({ name: "TaggedPostsFail", message: "unable to send tagged Posts" });
    }
  } catch ({ name, message }) {
    next({ name, message });
  }
});

module.exports = tagsRouter;