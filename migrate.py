from pymongo import MongoClient

# Local DB
local = MongoClient('mongodb://localhost:27017')
local_db = local['healtrack_ai']

# Atlas
atlas = MongoClient('mongodb+srv://kmutarwala_db_user:Admin1234@cluster0.r1ydgyv.mongodb.net/healtrack_ai?retryWrites=true&w=majority&appName=Cluster0')
atlas_db = atlas['healtrack_ai']

collections = ['users', 'patients', 'appointments', 'messages', 'notifications', 'sos_events']

for col in collections:
    docs = list(local_db[col].find())
    if docs:
        atlas_db[col].delete_many({})
        atlas_db[col].insert_many(docs)
        print(f'{col}: {len(docs)} documents migrated')
    else:
        print(f'{col}: empty, skipped')

local.close()
atlas.close()
print('Migration complete!')