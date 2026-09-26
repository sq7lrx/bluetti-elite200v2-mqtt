#!/usr/bin/env python3
"""
Converts a Bluetti license file (CSV) into the JSON format required
by the MQTT application.

Usage: python convert_license.py bluetti_device_licence.csv [MAC_ADDRESS]
"""

import sys
import json
import os

def convert_license_to_json(license_file, mac_address=None, output_file="encryption_keys.json"):
    """
    Converts a CSV license file into the JSON format
    
    Args:
        license_file: Path to the CSV license file
        mac_address: MAC address of the device (optional)
        output_file: JSON output file
    """
    
    try:
        # Read and normalise (blank lines are ignored)
        with open(license_file, 'r') as f:
            raw_lines = [l.strip() for l in f.readlines()]

        lines = [l for l in raw_lines if l]

        # Accepted formats (after filtering out blank lines):
        # 4 lines: bluetti, timestamp, md5_key, encryption_key
        # 5+ lines: (legacy) bluetti may be preceded by a blank line in the original file
        if len(lines) < 4:
            print("❌ Error: The license file does not meet the minimum format (4 non-empty lines)")
            print("   Simplified expected format:")
            print("     1: bluetti")
            print("     2: timestamp")
            print("     3: MD5 key")
            print("     4: encryption key")
            return False

        # If there are more lines, take the first valid ones in order
        # (this gives tolerance for future formats with extra metadata)
        bluetti_marker = lines[0].lower()
        if bluetti_marker != 'bluetti':
            # Some variants may have a first line with a BOM or text; try to locate 'bluetti'
            try:
                idx = [i for i, v in enumerate(lines) if v.lower() == 'bluetti'][0]
                lines = lines[idx:]
                if len(lines) < 4:
                    raise ValueError("Not enough lines after the bluetti marker")
            except Exception:
                print("❌ Error: The 'bluetti' marker was not found on the first line")
                return False

        timestamp = lines[1].strip()
        md5_key = lines[2].strip()
        encryption_key = lines[3].strip()
        
        print(f"📄 Processing license file:")
        print(f"   Timestamp: {timestamp}")
        print(f"   MD5 Key: {md5_key[:16]}...{md5_key[-16:]}")
        print(f"   Encryption Key: {encryption_key[:32]}...{encryption_key[-32:]}")
        
        # If no MAC was provided, ask for it
        if not mac_address:
            mac_address = input("\n🔍 Enter the device MAC address (XX:XX:XX:XX:XX:XX): ").strip()
        
        # Validate the MAC format
        if not validate_mac_address(mac_address):
            print("❌ Error: Invalid MAC address format")
            return False
        
        # Build the JSON structure
        # Note: We use the MD5 key as 'key' and the encryption key as 'token'
        # This mapping may need adjustments depending on the specific protocol
        encryption_data = {
            mac_address: {
                "pin": "000000",  # Default PIN
                "key": md5_key,
                "token": encryption_key
            }
        }
        
        # Save the JSON file
        with open(output_file, 'w') as f:
            json.dump(encryption_data, f, indent=2)
        
        print(f"\n✅ Conversion completed!")
        print(f"   Generated file: {output_file}")
        print(f"   Device: {mac_address}")
        
        # Show instructions
        print(f"\n📋 Instructions:")
        print(f"   1. Copy the file {output_file} to the project root directory")
        print(f"   2. Update the .env file with BLUETTI_MAC={mac_address}")
        print(f"   3. Run python tools/verify_keys.py to verify the keys")
        
        return True
        
    except FileNotFoundError:
        print(f"❌ Error: File not found: {license_file}")
        return False
    except Exception as e:
        print(f"❌ Error processing the file: {e}")
        return False

def validate_mac_address(mac):
    """Validates the format of a MAC address"""
    if not mac:
        return False
    
    parts = mac.split(':')
    if len(parts) != 6:
        return False
    
    for part in parts:
        if len(part) != 2:
            return False
        try:
            int(part, 16)
        except ValueError:
            return False
    
    return True

def main():
    if len(sys.argv) < 2:
        print("Usage: python convert_license.py <license_file.csv> [MAC_ADDRESS]")
        print()
        print("Example:")
        print("  python convert_license.py bluetti_device_licence.csv")
        print("  python convert_license.py bluetti_device_licence.csv E4:B3:23:5B:F5:76")
        sys.exit(1)
    
    license_file = sys.argv[1]
    mac_address = sys.argv[2] if len(sys.argv) > 2 else None
    
    print("🔧 Bluetti license to JSON converter")
    print("=" * 50)
    
    if convert_license_to_json(license_file, mac_address):
        sys.exit(0)
    else:
        sys.exit(1)

if __name__ == "__main__":
    main()
