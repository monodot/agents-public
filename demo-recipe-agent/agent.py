import anthropic
import json

client = anthropic.Anthropic() # Expects env var ANTHROPIC_API_KEY

# Simulated recipe database
RECIPE_DB = {
    "pasta_carbonara": {
        "name": "Pasta Carbonara",
        "cuisine": "Italian",
        "time": "20 minutes",
        "ingredients": ["pasta", "eggs", "bacon", "parmesan", "black pepper"],
        "difficulty": "easy"
    },
    "chicken_tikka": {
        "name": "Chicken Tikka Masala",
        "cuisine": "Indian",
        "time": "45 minutes",
        "ingredients": ["chicken", "yogurt", "tomatoes", "cream", "spices"],
        "difficulty": "medium"
    },
    "caesar_salad": {
        "name": "Caesar Salad",
        "cuisine": "American",
        "time": "15 minutes",
        "ingredients": ["romaine lettuce", "croutons", "parmesan", "caesar dressing"],
        "difficulty": "easy"
    }
}

favorites = []

# Tool definitions
tools = [
    {
        "name": "search_recipes",
        "description": "Search for recipes by cuisine, difficulty, or cooking time",
        "input_schema": {
            "type": "object",
            "properties": {
                "cuisine": {
                    "type": "string",
                    "description": "The cuisine type (e.g., Italian, Indian, American)"
                },
                "max_time": {
                    "type": "integer",
                    "description": "Maximum cooking time in minutes"
                },
                "difficulty": {
                    "type": "string",
                    "enum": ["easy", "medium", "hard"],
                    "description": "Difficulty level"
                }
            }
        }
    },
    {
        "name": "get_recipe_details",
        "description": "Get full details of a specific recipe by ID",
        "input_schema": {
            "type": "object",
            "properties": {
                "recipe_id": {
                    "type": "string",
                    "description": "The recipe identifier"
                }
            },
            "required": ["recipe_id"]
        }
    },
    {
        "name": "save_favorite",
        "description": "Save a recipe to the user's favorites list",
        "input_schema": {
            "type": "object",
            "properties": {
                "recipe_id": {
                    "type": "string",
                    "description": "The recipe identifier to save"
                }
            },
            "required": ["recipe_id"]
        }
    },
    {
        "name": "list_favorites",
        "description": "List all recipes saved to favorites",
        "input_schema": {
            "type": "object",
            "properties": {}
        }
    }
]

# Tool implementations
def search_recipes(cuisine=None, max_time=None, difficulty=None):
    results = []
    for recipe_id, recipe in RECIPE_DB.items():
        if cuisine and recipe["cuisine"].lower() != cuisine.lower():
            continue
        if max_time and int(recipe["time"].split()[0]) > max_time:
            continue
        if difficulty and recipe["difficulty"] != difficulty:
            continue
        results.append({"id": recipe_id, "name": recipe["name"], "cuisine": recipe["cuisine"]})
    return results

def get_recipe_details(recipe_id):
    return RECIPE_DB.get(recipe_id, {"error": "Recipe not found"})

def save_favorite(recipe_id):
    if recipe_id in RECIPE_DB and recipe_id not in favorites:
        favorites.append(recipe_id)
        return {"status": "success", "message": f"Saved {RECIPE_DB[recipe_id]['name']} to favorites"}
    return {"status": "error", "message": "Recipe not found or already in favorites"}

def list_favorites():
    return [{"id": fav_id, "name": RECIPE_DB[fav_id]["name"]} for fav_id in favorites]

# Process tool calls
def process_tool_call(tool_name, tool_input):
    if tool_name == "search_recipes":
        return search_recipes(**tool_input)
    elif tool_name == "get_recipe_details":
        return get_recipe_details(**tool_input)
    elif tool_name == "save_favorite":
        return save_favorite(**tool_input)
    elif tool_name == "list_favorites":
        return list_favorites(**tool_input)

# Main agent loop
def run_agent(user_message):
    print(f"\n{'='*60}")
    print(f"User: {user_message}")
    print(f"{'='*60}\n")

    messages = [{"role": "user", "content": user_message}]

    while True:
        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=4096,
            tools=tools,
            messages=messages
        )

        print(f"Stop Reason: {response.stop_reason}")

        # Check if Claude wants to use tools
        if response.stop_reason == "tool_use":
            # Extract tool use from response
            tool_uses = [block for block in response.content if block.type == "tool_use"]

            # Add assistant's response to messages
            messages.append({"role": "assistant", "content": response.content})

            # Process each tool call
            tool_results = []
            for tool_use in tool_uses:
                tool_name = tool_use.name
                tool_input = tool_use.input

                print(f"🔧 Tool Call: {tool_name}")
                print(f"   Input: {json.dumps(tool_input, indent=2)}")

                # Execute the tool
                result = process_tool_call(tool_name, tool_input)

                print(f"   Result: {json.dumps(result, indent=2)}\n")

                tool_results.append({
                    "type": "tool_result",
                    "tool_use_id": tool_use.id,
                    "content": json.dumps(result)
                })

            # Send tool results back to Claude
            messages.append({"role": "user", "content": tool_results})

        else:
            # Claude is done, print final response
            final_text = next(
                (block.text for block in response.content if hasattr(block, "text")),
                None
            )
            print(f"Assistant: {final_text}\n")
            break

# Try it out!
if __name__ == "__main__":
    # Example conversations
    run_agent("I want to cook something Italian that takes less than 30 minutes")
    # run_agent("Tell me more about the pasta carbonara recipe and save it to my favorites")
    # run_agent("What recipes do I have in my favorites?")
