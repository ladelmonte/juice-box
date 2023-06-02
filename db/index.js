const { Client } = require("pg");
const { rows } = require("pg/lib/defaults");
const client = new Client("postgres://localhost:5432/juicebox-dev");

module.exports = {
  client,
};

async function getAllUsers() {
  const { rows } = await client.query(
    `SELECT id, username, name, location, active FROM users;`
  );
  return rows;
}

async function createUser({ username, password, name, location }) {
  try {
    const {
      rows: [user],
    } = await client.query(
      `
    INSERT INTO users (username, password, name, location) 
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (username) DO NOTHING
    RETURNING *;`,
      [username, password, name, location]
    );

    return user;
  } catch (error) {
    throw error;
  }
}

async function updateUser(id, fields = {}) {
  const setString = Object.keys(fields)
    .map((key, index) => `"${key}"=$${index + 1}`)
    .join(", ");
  if (setString.length === 0) {
    return;
  }
  try {
    const {
      rows: [user],
    } = await client.query(
      `
    UPDATE users
    SET ${setString}
    WHERE id=${id}
    RETURNING *;
    `,
      Object.values(fields)
    );
    return user;
  } catch (error) {
    throw error;
  }
}

async function createPost({ authorId, title, content, tags = [] }) {
  try {
    const {
      rows: [post],
    } = await client.query(
      `INSERT INTO posts ("authorId", title, content)
      VALUES ($1, $2, $3)
      RETURNING *;`,
      [authorId, title, content]
    );

    const tagList = await createTags(tags);

    return await addTagsToPost(post.id, tagList);
  } catch (error) {
    throw error;
  }
}

async function updatePost(postId, fields = {}) {
  console.log("postId", postId);
  console.log("fields", fields);
  const { tags } = fields;
  delete fields.tags;

  const setString = Object.keys(fields)
    .map((key, index) => `"${key}"=$${index + 1}`)
    .join(", ");

  console.log("setString", setString);
  console.log(Object.keys(fields));

  try {
    if (setString.length > 0) {
      await client.query(
        `
        UPDATE posts 
        SET ${setString} 
        WHERE id=${postId}
        RETURNING *;
      `,
        Object.values(fields)
      );
    }
    console.log("passed setString if statement");
    if (!tags) {
      return await getPostById(postId);
    }

    const tagList = await createTags(tags);
    const tagListIdString = tagList.map((tag) => `${tag.id}`).join(", ");

    await client.query(
      `
      DELETE FROM post_tags
      WHERE "tagId"
      NOT IN (${tagListIdString})
      AND "postId" = $1;`,
      [postId]
    );

    await addTagsToPost(postId, tagList);

    return await getPostById(postId);
  } catch (error) {
    console.log("Error in updatePost");
    throw error;
  }
}

async function getPostsByUser(userId) {
  try {
    const { rows: postIds } = await client.query(
      `
    SELECT id
    FROM posts
    WHERE "authorId"=$1;
    `,
      [userId]
    );

    const posts = await Promise.all(
      postIds.map((post) => getPostById(post.id))
    );
    console.log("getPostsByUser", posts);
    return posts;
  } catch (error) {
    throw error;
  }
}

async function getUserById(userId) {
  try {
    const {
      rows: [user],
    } = await client.query(`
    SELECT id, username, name, location, active FROM users
    WHERE id = ${userId}`);
    if (!user) {
      return null;
    }
    user.posts = await getPostsByUser(userId);
    return user;
  } catch (error) {
    throw error;
  }
}

async function getAllPosts() {
  const { rows: postIds } = await client.query(`
  SELECT id 
  FROM posts;`);

  const posts = await Promise.all(postIds.map((post) => getPostById(post.id)));
  return posts;
}

async function createTags(tagList) {
  if (tagList.length === 0) {
    return;
  }

  console.log("taglist", tagList);

  const insertValues = tagList
    .map((name, index) => `$${index + 1}`)
    .join("), (");

  const selectValues = tagList.map((name, index) => `$${index + 1}`).join(", ");

  try {
    await client.query(
      `
      INSERT INTO tags(name)
      VALUES (${insertValues})
      ON CONFLICT (name) DO NOTHING;`,
      tagList
    );
    const { rows } = await client.query(
      `
    SELECT * FROM tags
    WHERE name
    in (${selectValues});`,
      tagList
    );
    console.log(rows);
    return rows;
  } catch (error) {
    console.log("Error in createTags");
    throw error;
  }
}

async function createPostTag(postId, tagId) {
  try {
    await client.query(
      `
    INSERT INTO post_tags("postId", "tagId")
    VALUES ($1, $2)
    ON CONFLICT ("postId", "tagId") DO NOTHING;`,
      [postId, tagId]
    );
  } catch (error) {
    console.log("Error in createPostTag");
    throw error;
  }
}

async function addTagsToPost(postId, tagList) {
  if (tagList.length) {
    try {
      const createPostTagPromises = tagList.map((tag) =>
        createPostTag(postId, tag.id)
      );

      await Promise.all(createPostTagPromises);

      return await getPostById(postId);
    } catch (error) {
      console.log("Error in addTagsToPost");
      throw error;
    }
  }
}

async function getPostById(postId) {
  try {
    const {
      rows: [post],
    } = await client.query(
      `
    SELECT * FROM posts
    where id=$1;`,
      [postId]
    );

    if (!post) {
      throw {
        name: "PostNotFoundError",
        message: "Could not find a post with that postId",
      };
    }

    const { rows: tags } = await client.query(
      `
    SELECT tags.* FROM tags
    JOIN post_tags ON tags.id=post_tags."tagId"
    where post_tags."postId"=$1;`,
      [postId]
    );

    const {
      rows: [author],
    } = await client.query(
      `
    SELECT id, username, name, location
    FROM users
    Where id=$1;`,
      [post.authorId]
    );

    post.tags = tags;
    post.author = author;

    delete post.authorId;
    console.log("getPostById", post);
    return post;
  } catch (error) {
    console.log("error in getPostById");
    throw error;
  }
}

async function getPostsByTagName(tagName) {
  try {
    const { rows: postIds } = await client.query(
      `
    SELECT posts.id
    FROM posts
    JOIN post_tags ON posts.id=post_tags."postId"
    JOIN tags ON tags.id=post_tags."tagId"
    where tags.name=$1;`,
      [tagName]
    );

    return await Promise.all(postIds.map((post) => getPostById(post.id)));
  } catch (error) {
    console.log("error in getPostsByTagName");
    throw error;
  }
}

async function getAllTags() {
  try {
    const { rows: tags } = await client.query(`SELECT * FROM tags;`);

    return tags;
  } catch (error) {
    console.log("error in getAllTags");
    throw error;
  }
}

async function getUserByUsername(username) {
  try {
    const {
      rows: [user],
    } = await client.query(
      `
    SELECT * 
    FROM users
    WHERE username = $1;`,
      [username]
    );

    return user;
  } catch (error) {
    console.log("error in getUserByUsername");
    throw error;
  }
}

module.exports = {
  client,
  getAllUsers,
  createUser,
  updateUser,
  createPost,
  updatePost,
  getPostsByUser,
  getUserById,
  getAllPosts,
  createTags,
  addTagsToPost,
  getPostsByTagName,
  getAllTags,
  getUserByUsername,
  getPostById,
};