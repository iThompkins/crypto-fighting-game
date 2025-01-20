const express = require('express');
const Gun = require('gun');
const app = express();
const port = 8765;

app.use(Gun.serve);
app.use(express.static('.'));

const server = app.listen(port, () => {
  console.log(`Game server running on port ${port}`);
});

Gun({ web: server });
