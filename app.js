const express = require("express");
const path = require("path");
const crypto = require("crypto");
const mongoose = require("mongoose");
const multer = require("multer");
const { GridFsStorage } = require("multer-gridfs-storage");
const Grid = require("gridfs-stream");
const methodOverride = require("method-override");
const bodyparser = require("body-parser");
const app = express();

//middleware
app.use(bodyparser.json());
app.use(methodOverride("_method"));
app.set("view engine", "ejs");

//mongo uri
const mongoUri = "mongodb://localhost:27017";
//create mongo connection
const conn = mongoose.createConnection(mongoUri);
//init gridfs stream
let gfs;
conn.once("open", () => {
  //initialize stream
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
  //res.render("index");
  res.redirect("/");
});

//@route POST /upload
//@desc uploads file to db
app.post("/upload", upload.single("file"), (req, res) => {
  res.json({ file: req.file });
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
//desc display all files in json
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

const port = 5000;
app.listen(port, () => console.log(`listening on port ${port}`));
