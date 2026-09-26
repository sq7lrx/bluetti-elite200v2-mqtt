#!/usr/bin/env python3
"""Probe Bluetti register blocks and dump them as 16-bit words.

Unlike readregister_cli, this waits for the connection to settle, paces the
reads, retries transient BLE errors, and prints each block decoded as uint16
words so repeating structures (such as per-cell voltages) are easy to spot.

Usage:
    python -m tools.probe_registers <MAC> [--block ADDR:COUNT ...]
"""

import argparse
import asyncio
import contextlib
import logging
import sys

from bleak import BleakScanner

from bluetti_mqtt.bluetooth import BluetoothClient
from bluetti_mqtt.bluetooth.encryption import is_device_using_encryption
from bluetti_mqtt.core import ReadHoldingRegisters

DEFAULT_BLOCKS = [
    (6000, 31),   # PACK_MAIN_INFO - known good, sanity check
    (6100, 60),   # PACK_ITEM_INFO
    (6300, 60),   # PACK_SUB_PACK_INFO (cells split start)
    (6360, 60),
    (7000, 30),   # PACK_SETTING
    (7200, 40),   # PACK_BMU_INFO
]


async def read_block(client, address, count, attempts=4):
    last_error = None
    for attempt in range(attempts):
        try:
            command = ReadHoldingRegisters(address, count)
            future = await client.perform(command)
            response = await asyncio.wait_for(future, timeout=15)
            return command.parse_response(response)
        except Exception as err:  # noqa: BLE001 - probing, report and continue
            last_error = err
            await asyncio.sleep(1.5 * (attempt + 1))
    raise last_error


def dump(address, data):
    words = [int.from_bytes(data[i:i + 2], 'big') for i in range(0, len(data) - 1, 2)]
    print(f'\n=== {address} ({len(words)} words) ===')
    for i in range(0, len(words), 8):
        reg = address + i
        cells = ' '.join(f'{w:5}' for w in words[i:i + 8])
        raw = data[i * 2:i * 2 + 16].hex()
        print(f'  {reg:5}: {cells}   {raw}')
    return words


async def main(args):
    logging.basicConfig(level=logging.WARNING)

    print(f'Scanning for {args.address} ...')
    devices = await BleakScanner.discover(return_adv=True)
    record = devices.get(args.address)
    if record is None:
        print('Device not found in scan data. Is it powered on and in range?')
        return 1

    encrypted = is_device_using_encryption(record[1].manufacturer_data)
    print(f'Found {record[0].name}, encryption={encrypted}')

    client = BluetoothClient(args.address, encrypted)
    task = asyncio.create_task(client.run())

    for _ in range(40):
        if client.is_ready:
            break
        await asyncio.sleep(1)
    else:
        print('Timed out waiting for the device to become ready')
        task.cancel()
        return 1

    # Let the encrypted session settle before issuing reads.
    await asyncio.sleep(3)
    print('Connected.')

    blocks = []
    for spec in args.block or []:
        addr, _, count = spec.partition(':')
        blocks.append((int(addr), int(count or 1)))
    blocks = blocks or DEFAULT_BLOCKS

    for addr, count in blocks:
        try:
            data = await read_block(client, addr, count)
            dump(addr, data)
        except Exception as err:  # noqa: BLE001
            print(f'\n=== {addr} ===\n  failed: {err!r}')
        await asyncio.sleep(1.5)

    task.cancel()
    with contextlib.suppress(asyncio.CancelledError):
        await task
    return 0


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('address', metavar='MAC', help='Device MAC address')
    parser.add_argument(
        '--block',
        action='append',
        metavar='ADDR:COUNT',
        help='Register block to read, repeatable (default: the pack blocks)',
    )
    sys.exit(asyncio.run(main(parser.parse_args())))
