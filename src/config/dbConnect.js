const mongoose = require("mongoose");

const dbConnect = async() => {
    try{
        const conn = await mongoose.connect(process.env.CONNECTION_STRING, {
            dbName: 'project_portico',
            serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
        });
        console.log(`Connected to MongoDB:${conn.connection.host}`);
    } catch(err){
        console.log(err);
        process.exit(1);
        
    }
};

module.exports = dbConnect;