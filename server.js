const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

const players = {};
const votes = {};

const wordPairs = [
    ["初デート", "告白"],
    ["キス", "ハグ"],
    ["元カレ", "元カノ"],
    ["恋人", "片思い"],
    ["LINE", "電話"],
    ["遊園地", "水族館"],
    ["結婚", "同棲"],
    ["好き", "愛してる"],
    ["浮気", "嫉妬"],
    ["年上", "年下"],
    ["遠距離恋愛", "社内恋愛"],
    ["手紙", "プレゼント"],
    ["クリスマス", "バレンタイン"],
    ["ドライブ", "旅行"],
    ["婚約", "プロポーズ"],
    ["友達", "恋人"],
    ["マッチングアプリ", "合コン"],
    ["イケメン", "美女"],
    ["ディズニー", "USJ"],
    ["サプライズ", "記念日"]
];

let gameData = null;

io.on("connection", (socket) => {

    socket.on("join", (data) => {

        players[socket.id] = {
            name: data.name,
            role: data.role
        };

        io.emit("players", players);
    });

    socket.on("startGame", () => {

        const ids = Object.keys(players);

        if (ids.length < 3) {
            socket.emit("errorMessage", "3人以上必要");
            return;
        }

        const wolfIndex = Math.floor(Math.random() * ids.length);

        const wolfId = ids[wolfIndex];

        const pair = wordPairs[
            Math.floor(Math.random() * wordPairs.length)
        ];

        gameData = {
            wolfId,
            endTime: Date.now() + 60000
        };

        Object.keys(votes).forEach(k => delete votes[k]);

        ids.forEach(id => {

            io.to(id).emit("word", {
                word: id === wolfId ? pair[1] : pair[0]
            });
        });

        io.emit("timer", gameData.endTime);

        setTimeout(checkResult, 60000);
    });

    socket.on("vote", (targetId) => {

        votes[socket.id] = targetId;
    });

    socket.on("disconnect", () => {

        delete players[socket.id];
        delete votes[socket.id];

        io.emit("players", players);
    });
});

function checkResult() {

    const count = {};

    Object.values(votes).forEach(id => {

        count[id] = (count[id] || 0) + 1;
    });

    let max = 0;
    let selected = null;

    Object.entries(count).forEach(([id, c]) => {

        if (c > max) {
            max = c;
            selected = id;
        }
    });

    let result = "";

    if (selected === gameData.wolfId) {

        result = `市民の勝利！ ワードウルフは ${players[selected].name}`;
    } else {

        result = "ワードウルフの勝利！";
    }

    io.emit("result", result);
}

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {

    console.log("Server Start");
});
