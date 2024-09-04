import express from "express"
import express_ws from "express-ws"
import { TEMP_DATA_FOLDER } from "./song_loader"
import { Player } from "./player"
import { Connection } from "./connection"
const { app } = express_ws(express())

const player = new Player()

app.ws("/", ws => {
    player.connections.add(new Connection(ws, player))
})

app.get("/song/:id", (req, res) => {
    const id = req.params.id
    if (/[^a-z0-9_=-]/i.test(id)) {
        res.status(404).send("stupid")
        return
    }
    res.sendFile(TEMP_DATA_FOLDER + "/" + id + ".webm", { root: process.cwd() })
})

app.listen(3001, () => {
    console.log("listening")
})