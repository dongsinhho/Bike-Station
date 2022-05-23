import express, { json, response, urlencoded } from "express"
import cookieParser from "cookie-parser"
import cors from 'cors'
import { Low } from 'lowdb'
import { JSONFile } from 'lowdb'
import fetch from "node-fetch"

const db = new Low(new JSONFile('file.json'))

const app = express()
const PORT = 8088
const SERVER = 'localhost:3000'
const STATION_ID = "áđálkạds"
var token
setInterval(() => {
    fetch(SERVER, {
        method: "POST",
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        redirect: 'follow',
        credentials: 'include'
    }).then(
        response => response.json()
    ).then(
        data => token = data.token
    )
}, 360000000)
console.log(token)

app.use(cors({
    "origin": true,
    "credentials": true
}))
app.set('view engine', 'ejs');

// - Quản lý các xe trong trạm với lowDB
// Nhiệm vụ của station:
// - login vào system để nhận token

// - tạo một trang web để người dùng có thể truy cập, nhập id và trả xe
// ==> kiểm tra
// - nhận request từ hệ thống -> mở khoá xe

app.use(cookieParser())
app.use(json())
app.use(urlencoded({ extended: true }))


app.get('/get_all_slot', async (req, res) => {
    res.status(200).json(db.data.slot)
})

app.post('/create_slot', async (req, res) => {
    db.data.slot.push({
        slotNumber: db.data.slot.length + 1,
        bikeId: null,
        isOpen: true
    })
    db.write()
    res.status(200).json({ message: "create success" })
})

app.get('/bike/:bikeId', async (req, res) => {
    try {
        db.get('slot')
            .find({ bikeId: req.params.bikeId })
            .assign({ bikeId: null, isOpen: true })
            .write()
        res.status(200).json({status: true, message: "create success" })
    }
    catch(e) {
        res.status(500).json({status: false, message: e})
        return
    }
})

app.get('/', async (req, res) => {
    res.render('index.ejs')
})
app.get('/return_bike', async (req, res) => {
    res.render('returnBike.ejs');
})

app.post('/return_bike', (req, res) => {
    const { bikeId } = req.body
    fetch(`${SERVER}/${STATION_ID}/${bikeId}`, {
        method: "POST",
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        redirect: 'follow',
        credentials: 'include'
    }).then(response => response.json())
    .then(data => {
        if(data.status) {
            db.get('slot')
                .find({bikeId: null})
                .assign({ bikeId: bikeId, isOpen: false })
                .write()
            return res.render('success.ejs');
        }
        else {
            let data = `Nguyên nhân: ${data.message}`
            return res.render('failure.ejs', {data: data});
        }
    })
    .catch(e => {
        let data = `Nguyên nhân: ${e}`
        return res.render('failure.ejs', {data: data});
    })     
})

app.delete('/:bikeId', async (req, res) => {
    res.status(200).json({ message: "create success" })
})

db.read()
db.data ||= { slot: [] }
const { slot } = db.data

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`)
})
