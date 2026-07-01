from pymongo import MongoClient
client = MongoClient('mongodb://localhost:27017')
db = client['healtrack_ai']
users = list(db['users'].find({}, {'email': 1, 'role': 1, 'name': 1}))
for u in users:
    print(u)
client.close()