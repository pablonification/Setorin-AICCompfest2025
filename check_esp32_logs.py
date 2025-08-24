#!/usr/bin/env python3
import asyncio
import sys
import os

# Add the backend src to path
sys.path.append('backend/src')

async def main():
    try:
        from backend.db.mongo import ensure_connection
        
        db = await ensure_connection()
        logs = await db['esp32_logs'].find().sort('timestamp', -1).limit(10).to_list(length=10)
        
        print(f'Found {len(logs)} ESP32 logs:')
        print('=' * 80)
        
        for log in logs:
            timestamp = log.get('timestamp', 'Unknown')
            device_id = log.get('device_id', 'Unknown')
            action = log.get('action', 'Unknown')
            status = log.get('status', 'Unknown')
            error = log.get('error_message', 'No error')
            
            print(f'{timestamp}: {device_id} - {action} - {status}')
            if error != 'No error':
                print(f'  Error: {error}')
            print()
            
    except Exception as e:
        print(f'Error: {e}')
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    asyncio.run(main())
