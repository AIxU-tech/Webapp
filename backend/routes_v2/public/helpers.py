

def format_city_results(data, max_length=5):
    formatted_results = []
    seen = set()

    for item in data:
        address = item.get('address', {})
        city = (address.get('city') or
                address.get('town') or
                address.get('village') or
                address.get('municipality') or
                item.get('name'))
        state = address.get('state')

        if not city:
            continue

        display_name = f"{city}, {state}" if state else city

        # Skip duplicates
        if display_name in seen:
            continue
        seen.add(display_name)

        results.append({
            'id': item.get('place_id'),
            'displayName': display_name,
            'city': city,
            'state': state,
        })

        if len(results) >= max_length:
            break

    return formatted_results

