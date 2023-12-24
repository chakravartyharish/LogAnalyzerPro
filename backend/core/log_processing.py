import re
import gzip
import os

# Regular expression patterns for different log types
can_log_pattern = r'(?P<time>\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2},\d{3}) - <CAN\s+flags=(?P<flags>[^ ]*)\s+identifier=(?P<identifier>[^ ]+)\s+length=(?P<length>\d+)\s+reserved=(?P<reserved>\d+)\s+data=b\'(?P<data>[^\']+)\'\s*\|>'
isotp_log_pattern = r'(?P<time>\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2},\d{3}) - <ISOTP\s+data=b\'(?P<data>[^\']+?)\'\s*\|>'
generic_log_pattern = r'(?P<time>\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2},\d{3}) - (?P<message>.+)'

def decompress_gz_file(gz_file_path):
    if not gz_file_path.endswith('.gz'):
        print(f"Error: {gz_file_path} is not a .gz file.")
        return None
    log_file_path = gz_file_path.rstrip('.gz')
    try:
        with gzip.open(gz_file_path, 'rb') as gz_file, open(log_file_path, 'wb') as log_file:
            log_file.write(gz_file.read())
        print(f"Decompressed {gz_file_path} to {log_file_path}")
    except Exception as e: 
        print(f"Error occurred during decompression: {e}")
        return None
    return log_file_path

def parse_log_entry(log_line):
    can_match = re.match(can_log_pattern, log_line)
    if can_match:
        can_details = can_match.groupdict()
        can_details['length'] = int(can_details['length'])
        can_details['reserved'] = int(can_details['reserved'])
        can_details['data'] = clean_and_convert_hex_string(can_details['data'])
        can_details['type'] = 'CAN'
        return can_details

    isotp_match = re.match(isotp_log_pattern, log_line)
    if isotp_match:
        isotp_details = isotp_match.groupdict()
        isotp_details['data'] = clean_and_convert_hex_string(isotp_details['data'])
        isotp_details['type'] = 'ISOTP'
        return isotp_details

    generic_match = re.match(generic_log_pattern, log_line)
    if generic_match:
        generic_details = generic_match.groupdict()
        generic_details['type'] = 'GENERIC'
        return generic_details

    return None

def clean_and_convert_hex_string(hex_string):
    try:
        clean_hex_string = ''.join(re.findall(r'\\x([0-9a-fA-F]{2})', hex_string))
        return bytes.fromhex(clean_hex_string)
    except ValueError:
        print(f"Error converting hex string: {hex_string}")
        return None

def evaluate_query(entry, query):
    try:
        conditions = query.split('&&')
        for condition in conditions:
            field, op_symbol, value = re.match(r'(\w+)\s*(==|!=|<|<=|>|>=)\s*(.*)', condition.strip()).groups()
                    
            if field not in entry:
                print(f"Field '{field}' not in entry, skipping condition.")
                continue

            entry_value = entry[field]
            if entry_value is None:
                print(f"Value for field '{field}' is None, skipping condition.")
                continue

            if isinstance(entry_value, int):               
                if value.isdigit():
                    value = int(value)
                else:
                    print(f"Value '{value}' for field '{field}' is not a valid integer, skipping condition.")
                    continue
            elif isinstance(entry_value, bytes):                
                value = bytes.fromhex(value.strip("'\""))
            else:               
                value = value.strip("'\"")        
           
            if op_symbol == '==':
                if not isinstance(entry_value, bytes) and str(entry_value).lower() != str(value).lower():
                    return False
            elif op_symbol == '!=':
                if not isinstance(entry_value, bytes) and str(entry_value).lower() == str(value).lower():
                    return False
            elif op_symbol == '<':
                if entry_value >= value:
                    return False
            elif op_symbol == '<=':
                if entry_value > value:
                    return False
            elif op_symbol == '>':
                if entry_value <= value:
                    return False
            elif op_symbol == '>=':
                if entry_value < value:
                    return False
        return True
    except Exception as e:
        print(f"Error evaluating query: {e}")
        return False

def process_and_search_log_file(file_path, query):    
    decompressed_file_path = decompress_gz_file(file_path)
    parsed_entries = []
    with open(decompressed_file_path, 'r', encoding='utf-8', errors='replace') as file:
        for line in file:
            parsed_entry = parse_log_entry(line)
            if parsed_entry and evaluate_query(parsed_entry, query):
                if 'data' in parsed_entry and isinstance(parsed_entry['data'], bytes):
                    parsed_entry['data'] = parsed_entry['data'].hex()
                parsed_entries.append(parsed_entry)
    return parsed_entries


# gz_file_path = '../logfiles/can.log_kMG5WR8.gz'
# query = "type=='CAN'" 
# search_results = process_and_search_log_file(gz_file_path, query)
# print(search_results[:5]) 

