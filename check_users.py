from pymongo import MongoClient
client = MongoClient('mongodb+srv://kmutarwala_db_user:Admin1234@cluster0.r1ydgyv.mongodb.net/healtrack_ai?retryWrites=true&w=majority&appName=Cluster0')
db = client['healtrack_ai']
users = db['users'].find({}, {'email': 1, 'role': 1, 'name': 1})
for u in users:
    print(u)
client.close()