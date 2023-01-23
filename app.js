const express = require("express");
const path = require("path");
const crypto = require("crypto");
const mongoose = require("mongoose");
const multer = require("multer");
const { GridFsStorage } = require("multer-gridfs-storage");
const Grid = require("gridfs-stream");
const methodOverride = require("method-override");
const bodyparser = require("body-parser");
// const config = require("config");

const app = express();

//middleware
app.use(bodyparser.json());
app.use(methodOverride("_method"));
app.set("view engine", "ejs");

//mongo uri
//const mongoUri = config.get("db");
const mongoUri = "mongodb+srv://rahul:rahulcluster@images.xa4kz7z.mongodb.net/?retryWrites=true&w=majority";
//create mongo connection
const conn = mongoose.createConnection(mongoUri);
//init gridfs stream
// let gfs;
// conn.once("open", () => {
//   //initialize stream
//   gfs = Grid(conn.db, mongoose.mongo);
//   gfs.collection("uploads");
// });

let gfs, gridfsBucket;
conn.once("open", () => {
  gridfsBucket = new mongoose.mongo.GridFSBucket(conn.db, {
    bucketName: "uploads",
  });

  gfs = Grid(conn.db, mongoose.mongo);
  gfs.collection("uploads");
});
//create storage engine
const storage = new GridFsStorage({
  url: mongoUri,
  file: (req, file) => {
    return new Promise((resolve, reject) => {
      crypto.randomBytes(16, (err, buf) => {
        if (err) {
          return reject(err);
        }
       const filename = buf.toString("hex") + path.extname(file.originalname);
       console.log(filename)
        const fileInfo = {
          filename: filename,
          bucketName: "uploads",
        };
        resolve(fileInfo);
      });
    });
  },
});
const upload = multer({ storage });

//@route GET /
//@desc Loads form
app.get("/", (req, res) => {
  gfs.files.find().toArray((err, files) => {
    //check if files
    if (!files || files.length === 0) {
      res.render("index", { files: false });
    } else {
      files.map((file) => {
        if (
          file.contentType === "image/jpeg" ||
          file.contentType === "image/png"
        ) {
          file.isImage = true;
        } else {
          file.isImage = false;
        }
      });
      res.render("index", { files: files });
    }
  });
});

//@route POST /upload
//@desc uploads file to db
app.post("/upload", upload.single("file"), (req, res) => {
  res.redirect("/").json({ file: req.file });
});

//@route GET /files
//desc display all files in json
app.get("/files", (req, res) => {
  gfs.files.find().toArray((err, files) => {
    //check if files
    if (!files || files.length === 0) {
      res.status(404).json({
        err: "No files exists",
      });
    }
    //files exits
    res.json(files);
  });
});

//@route GET /files/:filename
//desc display single file
app.get("/files/:filename", (req, res) => {
  gfs.files.findOne({ filename: req.params.filename }, (err, file) => {
    //check if files
    if (!file || file.length === 0) {
      res.status(404).json({
        err: "No file exists",
      });
    }
    //file exits
    res.json(file);
  });
});

//@route GET /image/:filename
//desc display image

app.get("/image/:filename", (req, res) => {
  gfs.files.findOne({ filename: req.params.filename }, (err, file) => {
    //check if files
    if (!file || file.length === 0) {
      res.status(404).json({
        err: "No file exists",
      });
    }
    //check if image
    // if (file.contentType === "image/jpeg" || file.contentType === "img/png") {
    //   //read output to browser
    //   const readstream = gfs.createReadStream(file.filename);
    //   readstream.pipe(res);
    // } else {
    //   res.status(404).json({
    //     err: "not an image",
    //   });
    // }
    if (file.contentType === "image/jpeg" || file.contentType === "image/png") {
      const readStream = gridfsBucket.openDownloadStream(file._id);
      readStream.pipe(res);
    }
  });
});

//@route DELETE /files/:id
//@desc Delete file
app.delete("/files/:filename", async (req, res) => {
  const file = await gfs.files.findOne({ filename: req.params.filename });
  const gsfb = new mongoose.mongo.GridFSBucket(conn.db, {
    bucketName: "uploads",
  });
  gsfb.delete(file._id, function (err, gridStore) {
    if (err) return res.status(400);
    res.redirect("/");
  });
});
const port = process.env.PORT || 5000;
app.listen(port, () => console.log(`listening on port ${port}`));
