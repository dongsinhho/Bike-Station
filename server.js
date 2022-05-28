import express, { json, response, urlencoded } from "express"
import cookieParser from "cookie-parser"
import cors from 'cors'
import { Low } from 'lowdb'
import { JSONFile } from 'lowdb'
import fetch from "node-fetch"
import {join, dirname} from 'path'
import { fileURLToPath } from 'url'
import lodash from 'lodash'

const __dirname = dirname(fileURLToPath(import.meta.url));
const file = join(__dirname, 'file.json')
const db = new Low(new JSONFile(file))

const app = express()
const PORT = 8088
const SERVER = 'http://54.169.182.170:3000'
const STATION_ID = "6237fa2c1651303e209c7945"
const email = "stationbinhthanh@gmail.com"
const password = "Stationbinhthanh123"
var token = null

app.use(cors({
    "origin": true,
    "credentials": true
}))
app.set('view engine', 'ejs');

app.use(cookieParser())
app.use(json())
app.use(urlencoded({ extended: true }))


const retrieveToken = async () => {
    try {
        const res = await fetch(`${SERVER}/api/users/stationLogin`, {
            body: JSON.stringify({
                email: email,
                password: password
            }),
            method: "POST",
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            redirect: 'follow',
            credentials: 'include'
        })
        const data = await res.json()
        if (data) {
            token = data.token
            return true
        }
        return false
    }
    catch {
        console.log(res)
        return false
    }
}

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
        const updateSlot = db.chain.get('slot')
            .find({ bikeId: req.params.bikeId })
            .assign({ bikeId: null, isOpen: true })
            .value()
        db.write(updateSlot);
        res.status(200).json({ status: true, message: "create success" })
    }
    catch (e) {
        res.status(500).json({ status: false, message: e })
        return
    }
})

app.get('/', async (req, res) => {
    res.render('index.ejs')
})
app.get('/return_bike', async (req, res) => {
    res.render('returnBike.ejs');
})

const checkBikeInfo = async (bikeId) => {
    try {
        console.log("check bike info")
        console.log(token)
        const response = await fetch(`${SERVER}/api/stations/user/${STATION_ID}/${bikeId}`, {
            method: "POST",
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            redirect: 'follow',
            credentials: 'include'
        })
        console.log(response)
        if (response.status == 200) {
            return true
        } else {
            return false
        }
    } catch(err) {
        console.log(err)
        return false
    }
}

app.post('/return_bike', async (req, res) => {
    const { bikeId } = req.body
    if (!token) {
        const result = await retrieveToken()
        if (!result) {
            return res.render('failure.ejs', { data: `Nguyên nhân: Xác thực máy chủ không thành công` });
        }
    }
    const check = await checkBikeInfo(bikeId)
    console.log(check)
    if (check) {
        const updateSlot = db.chain.get('slot')
            .find({ bikeId: null })
            .assign({ bikeId: bikeId, isOpen: false })
            .value()
        db.write(updateSlot)
        return res.render('success.ejs');
    } else {
        return res.render('failure.ejs', { data: `Nguyên nhân: trả xe không thành công` });
    }
})

app.delete('/:bikeId', async (req, res) => {
    res.status(200).json({ message: "create success" })
})

await db.read()
db.data ||= { slot: [] }
db.chain = lodash.chain(db.data)
let { slot } = db.data

console.log(slot)

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`)
})
