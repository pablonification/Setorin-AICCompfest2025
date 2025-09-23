import asyncio
import json
import websockets
import logging

# Commands the ESP32 can send
{"cmd": "open"}
{"cmd": "close"}

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class SmartBinSimulator:
    def __init__(self):
        self.connected_clients = set()
        self.lid_open = False
        self.sensor_triggered = False

    async def register(self, websocket):
        self.connected_clients.add(websocket)
        logger.info(f"Client connected. Total clients: {len(self.connected_clients)}")

    async def unregister(self, websocket):
        self.connected_clients.remove(websocket)
        logger.info(f"Client disconnected. Total clients: {len(self.connected_clients)}")

    async def notify_clients(self, message):
        if self.connected_clients:
            await asyncio.wait([
                client.send(json.dumps(message)) for client in self.connected_clients
            ])

    async def handle_command(self, websocket, command):
        try:
            cmd = command.get("cmd")
            if cmd == "open":
                if not self.lid_open:
                    self.lid_open = True
                    logger.info("Opening lid...")
                    await websocket.send(json.dumps({"status": "lid_opening"}))
                    
                    await asyncio.sleep(2)
                    await websocket.send(json.dumps({"status": "lid_opened"}))
                    
                    await asyncio.sleep(3)
                    self.sensor_triggered = True
                    await websocket.send(json.dumps({"status": "sensor_triggered"}))
                    
                    await asyncio.sleep(2)
                    self.lid_open = False
                    await websocket.send(json.dumps({"status": "lid_closing"}))
                    
                    await asyncio.sleep(1)
                    await websocket.send(json.dumps({"status": "lid_closed"}))
                    self.sensor_triggered = False
                    
            elif cmd == "close":
                if self.lid_open:
                    self.lid_open = False
                    await websocket.send(json.dumps({"status": "lid_closing"}))
                    await asyncio.sleep(1)
                    await websocket.send(json.dumps({"status": "lid_closed"}))
                    
        except Exception as exc:
            logger.error(f"Error handling command: {exc}")

    async def handler(self, websocket, path):
        await self.register(websocket)
        try:
            async for message in websocket:
                try:
                    data = json.loads(message)
                    await self.handle_command(websocket, data)
                except json.JSONDecodeError:
                    logger.error(f"Invalid JSON received: {message}")
        except websockets.exceptions.ConnectionClosed:
            pass
        finally:
            await self.unregister(websocket)

async def main():
    simulator = SmartBinSimulator()
    async with websockets.serve(simulator.handler, "localhost", 8765):
        logger.info("SmartBin WebSocket simulator started on ws://localhost:8765")
        await asyncio.Future()

if __name__ == "__main__":
    asyncio.run(main())
