const {
    client,
    getAllUsers,
    createUser,
    updateUser,
    createPost,
    updatePost,
    getUserById,
    getAllPosts,
    getPostsByUser,
    addTagsToPost,
    createTags,
    getPostsByTagName,
  } = require("./index");
  
  async function createInitialUsers() {
    try {
      console.log("Starting to create users");
  
      const albert = await createUser({
        username: "albert",
        password: "bertie99",
        name: "Albert",
        location: "Yorkshire",
      });
  
      const sandra = await createUser({
        username: "sandra",
        password: "2sandy4me",
        name: "Sahandra",
        location: "Sahara Desert",
      });
  
      const glamgal = await createUser({
        username: "glamgal",
        password: "soglam",
        name: "Glenda",
        location: "Gloucestershire",
      });
  
      console.log(albert);
      console.log(sandra);
      console.log(glamgal);
  
      console.log("Finished creating users");
    } catch (error) {
      console.error("Error creating users");
      throw error;
    }
  }
  
  async function dropTables() {
    try {
      console.log("Starting to drop tables.");
      await client.query(`
      DROP TABLE IF EXISTS post_tags, tags, users, posts;`);
      console.log("Dropped tables!");
    } catch (error) {
      console.error("Error dropping tables!");
      throw error;
    }
  }
  
  async function createTables() {
    try {
      console.log("Starting to build tables.");
  
      await client.query(`
      CREATE TABLE users (
        id SERIAL PRIMARY KEY,
        username varchar(255) UNIQUE NOT NULL,
        password varchar(255) NOT NULL,
        name varchar(255) NOT NULL,
        location varchar(255) NOT NULL,
        active BOOLEAN DEFAULT true);
      CREATE TABLE posts(
        id SERIAL PRIMARY KEY,
        "authorId" INTEGER REFERENCES users(id) NOT NULL,
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        active BOOLEAN DEFAULT true);
      CREATE TABLE tags(
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL);
      CREATE TABLE post_tags(
        "postId" INTEGER REFERENCES posts(id) ,
        "tagId" INTEGER REFERENCES tags(id),
        UNIQUE ("postId", "tagId"));
      `);
  
      console.log("Finished building tables");
    } catch (error) {
      console.error("Error building tables!");
      throw error;
    }
  }
  
  async function createInitialPosts() {
    try {
      console.log("Starting to create Initial Posts");
      const [albert, sandra, glamgal] = await getAllUsers();
      console.log("Albert.id", albert.id);
      await createPost({
        authorId: albert.id,
        title: "First Post",
        content:
          "This is my first post. I hope I love writing blogs as much as I love writing them. Doesn't make much sense but okay.",
        tags: ["#happy", "#youcandoanything"],
      });
  
      await createPost({
        authorId: sandra.id,
        title: "Second Post",
        content:
          "This is my second post. Let's hope it is received better than my first.",
        tags: ["#happy", "#worst-day-ever"],
      });
  
      await createPost({
        authorId: glamgal.id,
        title: "How do I...",
        content:
          "...Tell my sister she has mascara gloop in her eye all the time?",
        tags: ["#happy", "#youcandoanything", "#catmandoeverything"],
      });
  
      console.log("Finished Creating Posts");
    } catch (error) {
      throw error;
    }
  }
  
  async function rebuildDB() {
    try {
      console.log("Starting to rebuild Database");
      client.connect();
      await dropTables();
      await createTables();
      await createInitialUsers();
      await createInitialPosts();
    } catch (error) {
      throw error;
    }
  }
  
  // async function testDB() {
  //   try {
  //     console.log("Starting to test database");
  
  //     console.log("Calling getAllUsers");
  //     const users = await getAllUsers();
  //     console.log("getAllUsers Result:", users);
  
  //     console.log("calling updateUser on users[0]");
  //     const updateUserResult = await updateUser(users[0].id, {
  //       name: "Newname Sogood",
  //       location: "Lesterville, KY",
  //     });
  //     console.log("UpdateUserResult", updateUserResult);
  
  //     console.log("Calling getAllPosts");
  //     const posts = await getAllPosts();
  //     console.log("getAllPosts Result", posts);
  
  //     console.log("Calling updatePosts on posts[0]");
  //     const updatePostResult = await updatePost(posts[0].id, {
  //       title: "New Title",
  //       content: "Updated content",
  //     });
  //     console.log("updatePost results", updatePostResult);
  
  //     console.log("Calling getUserById with 1");
  //     const albert = await getUserById(1);
  //     console.log("getUserById", albert);
  
  //     console.log("Finished database tests");
  //   } catch (error) {
  //     console.error("Error testing database");
  //     throw error;
  //   }
  // }
  
  async function testDB() {
    try {
      console.log("Starting to test database...");
  
      console.log("Calling getAllUsers");
      const users = await getAllUsers();
      console.log("Result:", users);
  
      console.log("Calling updateUser on users[0]");
      const updateUserResult = await updateUser(users[0].id, {
        name: "Newname Sogood",
        location: "Lesterville, KY",
      });
      console.log("Result:", updateUserResult);
  
      console.log("Calling getAllPosts");
      const posts = await getAllPosts();
      console.log("Result:", posts);
  
      console.log("Calling updatePost on posts[0]");
      const updatePostResult = await updatePost(posts[0].id, {
        title: "New Title",
        content: "Updated Content",
      });
      console.log("Result:", updatePostResult);
  
      console.log("Calling getUserById with 1");
      const albert = await getUserById(1);
      console.log("Result:", albert);
  
      console.log("calling updatePost on posts[1], only updating tags");
      const updatePostTagsResult = await updatePost(posts[1].id, {
        tags: ["#youcandoanything", "#redfish", "#bluefish"],
      });
      console.log("updatePostTagsResult", updatePostTagsResult);
  
      console.log("calling getPostsByTagName with #happy");
      const postsWithHappy = await getPostsByTagName("#happy");
      console.log("postsWithHappyResult", postsWithHappy);
  
      console.log("Finished database tests!");
    } catch (error) {
      console.log("Error during testDB");
      throw error;
    }
  }
  
  rebuildDB()
    .then(testDB)
    .catch(console.error)
    .finally(() => client.end());