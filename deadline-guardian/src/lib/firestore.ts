import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  where, 
  getDocs, 
  serverTimestamp, 
  orderBy 
} from "firebase/firestore";
import { db } from "./firebase";
import { Task } from "@/types/task";

const COLLECTION_NAME = "tasks";

// 1. CREATE: Add a new task
export const addTask = async (task: Omit<Task, "id" | "createdAt">) => {
  try {
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...task,
      createdAt: serverTimestamp(), // Let Firebase handle the time
    });
    return { success: true, id: docRef.id };
  } catch (error: any) {
    console.error("Error adding task:", error.message);
    throw new Error(error.message);
  }
};

// 2. READ: Get all tasks for a specific user
export const getUserTasks = async (userId: string) => {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where("userId", "==", userId),
      orderBy("createdAt", "desc")
    );
    
    const querySnapshot = await getDocs(q);
    const tasks: Task[] = [];
    
    querySnapshot.forEach((doc) => {
      tasks.push({ id: doc.id, ...doc.data() } as Task);
    });
    
    return tasks;
  } catch (error: any) {
    console.error("Error fetching tasks:", error.message);
    return [];
  }
};

// 3. UPDATE: Update an existing task
export const updateTask = async (taskId: string, updates: Partial<Task>) => {
  try {
    const taskRef = doc(db, COLLECTION_NAME, taskId);
    await updateDoc(taskRef, updates);
    return { success: true };
  } catch (error: any) {
    console.error("Error updating task:", error.message);
    throw new Error(error.message);
  }
};

// 4. DELETE: Remove a task
export const deleteTask = async (taskId: string) => {
  try {
    const taskRef = doc(db, COLLECTION_NAME, taskId);
    await deleteDoc(taskRef);
    return { success: true };
  } catch (error: any) {
    console.error("Error deleting task:", error.message);
    throw new Error(error.message);
  }
};