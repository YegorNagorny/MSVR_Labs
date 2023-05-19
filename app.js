const express = require("express");
const fs = require("fs");
 
const app = express();
app.use(function(request, response, next){
     
    let now = new Date();
    let hour = now.getHours();
    let minutes = now.getMinutes();
    let seconds = now.getSeconds();
    let data = `${hour}:${minutes}:${seconds} ${request.method} ${request.url} ${request.get("user-agent")}`;
    console.log(data);
    fs.appendFile("server.log", data + "\n", function(){});
    next();
});

app.use(express.static(__dirname + "/public_first"));
 
app.use("/", function(request, response){
     
    response.send("<h1>Главная страница</h1>");
});

app.get("/", function(request, response){
    response.send("Hello");
});
app.listen(3000);