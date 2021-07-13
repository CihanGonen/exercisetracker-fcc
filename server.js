const express = require('express')
const app = express()
const cors = require('cors')
const mongoose = require('mongoose');
require('dotenv').config()

const {Schema} = mongoose;

mongoose.connect('mongodb+srv://mongooseCihan:uI9BNnd7EyQMo69A@cluster0.u8qja.mongodb.net/mongooseFcc?retryWrites=true&w=majority',{ useNewUrlParser: true, useUnifiedTopology: true ,useFindAndModify:false});

var db = mongoose.connection;

db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
 console.log('mongoose connected');
});

const userSchema = new Schema({
  username:String,
  exercises: [{ 
    date: Number,
    duration: Number,
    description: String
   }]
})

let User = mongoose.model('User',userSchema);

app.use(cors())
app.use(express.json());
app.use(express.urlencoded({
  extended: true
}));
app.use(express.static('public'))


app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

app.post('/api/users', async(req,res)=>{
  if(req.body.username){
    let userExists = await User.findOne({'username':req.body.username});
    if(userExists){
      res.send('Username already taken')
    }
    else{
      await User.create(req.body);
      let newUser = await User.findOne({'username':req.body.username}).select('-__v -exercises');
      res.json(newUser);
    }
  }
  else{
    res.send("Path `username` is required.");
  }
})

app.get('/api/users',async(req,res)=>{
  let users = await User.find({}).select('-exercises');
  res.json(users);
})

app.post('/api/users/:_id?/exercises',async(req,res)=>{
  if(req.params._id){ 
    let {_id,description,duration,date} = req.body;
    let id  = req.params._id;
    try{
      let user = await User.findById(id);
      if(user){
        if(description && duration){
          if(!date){
            date = Date.now();
          }
          if(!isNaN(Number((+new Date(date)).toFixed(0)))){
            let saveDate = Number((+new Date(date)).toFixed(0))
            let exercises = user.exercises;
            exercises.push({date:saveDate,duration,description});
            await User.findByIdAndUpdate(id,{exercises});
            let updatedUser = await User.findById(id).select('-__v')
            let latestExercise = await updatedUser.exercises[exercises.length-1];
            let dateToShow = (new Date(latestExercise.date)).toUTCString();
            res.json({
              "_id":updatedUser._id,
              "username": updatedUser.username,
              "date":dateToShow,
              "duration":latestExercise.duration,
              "description":latestExercise.description
            });

          }else{
            res.json({ error : "Invalid Date" })
          }   
        }
        else{
          if(description){
            res.send('Path `duration` is required.');
          }
          else{
            res.send('Path `description` is required.');
          }
        }  
      }
      else{
        res.send('Unknown userId');
      }
    }catch(err){
      res.send(err.message);
    }
  }
  else{
    res.send('not found');
  }
})

app.get('/api/users/:_id/logs',async(req,res)=>{
  if(req.params._id){
    let {from,to,limit} = req.query;
    console.log('gelen from',from,to)
    if(!from || isNaN(Number((+new Date(from)).toFixed(0)))){
      from = '1970-1-1';
    }
    if(!to || isNaN(Number((+new Date(to)).toFixed(0)))){
      to='100000-12-30'
    }
    console.log(from,to);
    let fromStamp = (Number((+new Date(from)).toFixed(0)))
    let toStamp = (Number((+new Date(to)).toFixed(0)))
    console.log('fromStamp',fromStamp)
    console.log('toStamp',toStamp)
    let user = await User.findById(req.params._id);
    let exercises = user.exercises;
    if(!limit){
      limit=exercises.length;
    }
    let exercisesToShow = [];
    for(let i=0;i<exercises.length;i++){
        if(exercisesToShow.length>=limit){
          break;
        }
        if(exercises[i].date<fromStamp || exercises[i].date>toStamp){
          continue;
        }
        exercisesToShow.push({
          description:exercises[i].description,
          duration:exercises[i].duration,
          date:(new Date(exercises[i].date)).toUTCString()
        })
    }
  
    res.json({
      "_id":user._id,
      "username":user.username,
      "count":exercisesToShow.length,
      "log":exercisesToShow
    })
  }
  else{
    res.send('not found');
  }
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
