const express = require("express");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const jwt = require('jsonwebtoken');
const cors = require("cors");
const app = express();
const port = process.env.PORT || 5000;
require("dotenv").config();

// middle ware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.fvciqgr.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});


// JWT middleware
function verifyJwt( req, res, next ){
  const authHeader = req.headers.authorization;
  if(!authHeader){
   return res.status(401).send('unauthorize access')
  }
  const token = authHeader.split(' ')[1];
  jwt.verify(token, process.env.DB_JWT_TOKEN, function(err, decoded) {
    if(err)
    return res.status(401).send('unauthorize access');
  })
  req.decoded = decoded;
  next();
}

async function run() {
  try {

    const appointmentCollection = client.db("Appointment").collection("appointmentOperation");
    const bookingCollection = client.db("Appointment").collection("booking");
    const usersCollection = client.db("Appointment").collection("users");


    app.get("/appointments", async (req, res) => {
      const calenderDate = req.query.calenderDate;
      const query = {};
      const result = await appointmentCollection.find(query).toArray();


      //   --------------------- Get booking query and find out latest time slots ----------------------------
      const bookingQuery = { treatmentData: calenderDate };
      const alreadyBooked = await bookingCollection
        .find(bookingQuery)
        .toArray();

      result.forEach((results) => {
        const compareBooked = alreadyBooked.filter(
          (booked) => booked.treatmentName === results.name
        );
        const bookedSlot = compareBooked.map((booked) => booked.slot);
        const remaining = results.slots.filter(
          (slot) => !bookedSlot.includes(slot)
        );
        results.slots = remaining;
      });
      res.send(result);
    });


    app.post("/booking", async (req, res) => {
      const booking = req.body;
      const query = {
        treatmentData: booking.treatmentData,
        email: booking.email,
        treatmentName: booking.treatmentName,
      };
      const alreadyBooked = await bookingCollection.find(query).toArray();
      if (alreadyBooked.length) {
        const message = `You already booked ${booking.treatmentData}`;
        return res.send({ acknowledge: false, message });
      }
      const result = await bookingCollection.insertOne(booking);
      res.send(result);
    });


    app.get("/booking", verifyJwt, async (req, res) => {
      const decodedEmail = decoded.email;
      if(decodedEmail !== email){
        return res.status(403).send({message: 'unauthorize access'})
      }
      const email = req.query.email;
      const query = { email: email };
      const result = await bookingCollection.find(query).toArray();
      res.send(result);
    });


    app.get('/jwt', async (req, res)=> {
      const email = req.query.email;
      const query = {email: email}
      const user = await usersCollection.findOne(query)
      if(user){
        const token = jwt.sign({email}, process.env.DB_JWT_TOKEN, {expiresIn: "1h"})
        return res.send({AccessToken: token })
      }
         res.status(403).send({AccessToken: 'unauthorize access'})
    })

    app.get('/user', async(req, res) => {
      const query = {}
      const user = await usersCollection.find(query).toArray()
      res.send(user);
    })

    app.post('/user', async (req, res) => {
      const user = req.body;
      console.log(user)
      const result = await usersCollection.insertOne(user);
      res.send(result);
    })

    app.put('/user/admin:id', async(req,res) =>{
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const option = { upsert: true }
      updateDoc = {
        $set: {
          role: "Admin"
        }
      }
      const result = await usersCollection.updateOne(filter, updateDoc, option);
      res.send(result);
    })

  } finally {
  }
}
run().catch((error) => console.log(error));

app.get("/", (req, res) => {
  res.send("server site running");
});

app.listen(port, () => {
  console.log(`Example server site port ${port}`);
});
