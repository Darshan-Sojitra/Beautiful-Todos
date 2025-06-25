import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useAuth } from '../context/useAuth';

export function Todos({ todos: initialTodos, onUpdate, onDelete }) {
    const [todos, setTodos] = useState(initialTodos);
    const { token } = useAuth();

    // Update internal state when props change
    useEffect(() => {
        setTodos(initialTodos);
    }, [initialTodos]);

    const toggleTodoStatus = async (todo) => {
        try {
            // Optimistic UI update
            const updatedTodo = { ...todo, completed: !todo.completed };
            setTodos(prevTodos =>
                prevTodos.map(t =>
                    t._id === todo._id ? updatedTodo : t
                )
            );

            // Notify parent component of the update
            if (onUpdate) {
                onUpdate(updatedTodo);
            }

            // API call to update in database
            const response = await fetch(`${import.meta.env.VITE_API_URL}/todos/${todo._id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ completed: !todo.completed })
            });

            if (!response.ok) {
                // Revert optimistic update if server call fails
                setTodos(initialTodos);
                throw new Error('Failed to update todo');
            }

            // If you want to get the updated todo from the server
            const result = await response.json();
            console.log('Todo updated successfully:', result);

        } catch (error) {
            console.error('Error updating todo:', error);
            // Revert optimistic update if server call fails
            setTodos(initialTodos);
        }
    };

    // PropTypes are defined at the end of the file

    // New function to handle todo deletion
    const handleDeleteTodo = async (todoId) => {
        try {
            // Optimistic UI update
            setTodos(prevTodos => prevTodos.filter(todo => todo._id !== todoId));

            // Notify parent component of the deletion
            if (onDelete) {
                onDelete(todoId);
            }

            // API call to delete from database
            const response = await fetch(`${import.meta.env.VITE_API_URL}/todos/${todoId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                // Revert optimistic update if server call fails
                setTodos(initialTodos);
                throw new Error('Failed to delete todo');
            }

            console.log('Todo deleted successfully');

        } catch (error) {
            console.error('Error deleting todo:', error);
            // Revert optimistic update if server call fails
            setTodos(initialTodos);
        }
    };

    return (
        <div className="todo-list">
            {todos.map((todo, index) => (
                <div key={todo._id || index} className="todo-item">
                    <h2 className="todo-title">{todo.title}</h2>
                    <p className="todo-description">{todo.description}</p>
                    <div className="todo-actions">
                        <span className="todo-index">Task #{index + 1}</span>
                        <div className="button-group">
                            <button
                                className={`todo-button ${todo.completed ? 'complete' : 'incomplete'}`}
                                onClick={() => toggleTodoStatus(todo)}
                            >
                                {todo.completed ? "Completed ✓" : "Mark as Completed →"}
                            </button>
                            <button
                                className="todo-button delete"
                                onClick={() => handleDeleteTodo(todo._id)}
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            ))}

            {todos.length === 0 && (
                <div className="empty-state">
                    <div className="empty-title">Your todo list is empty</div>
                    <div className="empty-text">Add a new task above to get started!</div>
                </div>
            )}
        </div>
    );
}

Todos.propTypes = {
    todos: PropTypes.arrayOf(
        PropTypes.shape({
            _id: PropTypes.string,
            title: PropTypes.string.isRequired,
            description: PropTypes.string,
            completed: PropTypes.bool
        })
    ).isRequired,
    onUpdate: PropTypes.func,
    onDelete: PropTypes.func
};
