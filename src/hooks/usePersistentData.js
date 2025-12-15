import { useState } from 'react';

export const usePersistentData = (key, initialData) => {
  const [data, setData] = useState(() => {
    try {
      const savedData = localStorage.getItem(key);
      if (savedData) {
        const parsedData = JSON.parse(savedData);
        // Combine initial data with saved user data
        // We assume saved data is an array of user-uploaded items
        // Or if the saved data is the whole list, we just use it.
        // To keep it simple and robust: we save ONLY user uploaded items in a separate key usually, 
        // OR we save the whole list. 
        // Let's save the whole list for simplicity in this demo, 
        // but be aware updates to initialData won't reflect if we do this.
        
        // Better approach: Save only user items in LS, and merge on load.
        // But for "User Upload" feature, let's try to just append LS items to initialData.
        return [...parsedData, ...initialData];
      }
    } catch (error) {
      console.error('Error reading from localStorage', error);
    }
    return initialData;
  });

  // Helper to add item
  const addItem = (newItem) => {
    setData((prevData) => {
      const newData = [newItem, ...prevData];
      // Filter out initialData to find what to save
      const userItems = newData.filter(item => !initialData.find(i => i.id === item.id));
      try {
        localStorage.setItem(key, JSON.stringify(userItems));
      } catch (error) {
        console.error('Error saving to localStorage', error);
        // Handle quota exceeded
        if (error.name === 'QuotaExceededError') {
             alert("无法保存：存储空间已满。请尝试删除一些旧数据或上传较小的文件。");
        }
      }
      return newData;
    });
  };

  // Helper to delete item (only user items ideally)
  const deleteItem = (id) => {
      setData((prevData) => {
          const newData = prevData.filter(item => item.id !== id);
          const userItems = newData.filter(item => !initialData.find(i => i.id === item.id));
          localStorage.setItem(key, JSON.stringify(userItems));
          return newData;
      });
  };

  return [data, addItem, deleteItem];
};
