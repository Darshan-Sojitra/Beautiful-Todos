import { useState } from "react"
import PropTypes from 'prop-types';
import { useAuth } from '../context/useAuth';

export function CreateTodo(props) {
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const { token } = useAuth();

    return (
        <div>
            <div className="input-container">
                <input
                    type="text"
                    placeholder="Title"
                    value={title}
                    onChange={function (e) {
                        const value = e.target.value;
                        setTitle(value);
                    }}
                />
            </div>

            <div className="input-container">
                <textarea
                    placeholder="Description"
                    value={description}
                    onChange={function (e) {
                        const value = e.target.value;
                        setDescription(value);
                    }}
                ></textarea>
            </div>

            <button
                className="button"
                onClick={() => {
                    fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/todo`, {
                        method: "POST",
                        body: JSON.stringify({
                            title: title,
                            description: description,
                        }),
                        headers: {
                            "Content-Type": "application/json",
                            "Authorization": `Bearer ${token}`
                        },
                    })
                        .then(async function (res) {
                            if (!res.ok) {
                                throw new Error('Network response was not ok');
                            }

                            const json = await res.json();
                            console.log('Todo created:', json);

                            // Create new todo with generated ID if available
                            const newTodo = {
                                _id: json._id || json.todo?._id || Date.now().toString(), // Use server ID or fallback to timestamp
                                title: title,
                                description: description,
                                completed: false,
                            };

                            // Add the new todo to the list
                            props.addTodo(newTodo);

                            // Show success message
                            alert("Todo added successfully!");

                            // Clear form
                            setTitle("");
                            setDescription("");
                        })
                        .catch((err) => {
                            console.error(err);
                        });
                }}
            >
                {"✨ Add Todo"}
            </button>
        </div>
    );
}

CreateTodo.propTypes = {
    addTodo: PropTypes.func.isRequired, // This should be a function, not an array
};
