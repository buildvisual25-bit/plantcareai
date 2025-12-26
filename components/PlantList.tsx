import React, { useEffect, useState } from 'react';
import { getPlants, deletePlant, savePlant } from '../services/storageService';
import { PlantData, AppTab, Reminder } from '../types';

export const PlantList: React.FC<{onIdentify: (tab: AppTab) => void}> = ({onIdentify}) => {
  const [plants, setPlants] = useState<PlantData[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  
  // Reminder form state
  const [reminderType, setReminderType] = useState('Water');
  const [reminderFreq, setReminderFreq] = useState(7);
  const [isAddingReminder, setIsAddingReminder] = useState<string | null>(null);

  const loadPlants = async () => {
      const data = await getPlants();
      setPlants(data);
      setLoading(false);
  };

  useEffect(() => {
    loadPlants();
  }, []);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if(window.confirm("Remove this plant?")) {
        await deletePlant(id);
        await loadPlants();
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
    if (expandedId !== id) setIsAddingReminder(null);
  };

  const updatePlant = async (updatedPlant: PlantData) => {
    // Optimistic update
    setPlants(plants.map(p => p.id === updatedPlant.id ? updatedPlant : p));
    await savePlant(updatedPlant);
  };

  const addReminder = async (plantId: string) => {
    const plant = plants.find(p => p.id === plantId);
    if (!plant) return;

    const newReminder: Reminder = {
      id: Date.now().toString(),
      type: reminderType,
      frequencyDays: reminderFreq,
      lastCompleted: Date.now(),
      nextDue: Date.now() + (reminderFreq * 24 * 60 * 60 * 1000)
    };

    const updatedPlant = {
      ...plant,
      reminders: [...(plant.reminders || []), newReminder]
    };
    
    await updatePlant(updatedPlant);
    setIsAddingReminder(null);
    setReminderType('Water');
    setReminderFreq(7);
  };

  const deleteReminder = async (plantId: string, reminderId: string) => {
    const plant = plants.find(p => p.id === plantId);
    if (!plant || !plant.reminders) return;

    const updatedPlant = {
      ...plant,
      reminders: plant.reminders.filter(r => r.id !== reminderId)
    };
    await updatePlant(updatedPlant);
  };

  const completeReminder = async (plantId: string, reminderId: string) => {
    const plant = plants.find(p => p.id === plantId);
    if (!plant || !plant.reminders) return;

    const updatedPlant = {
      ...plant,
      reminders: plant.reminders.map(r => {
        if (r.id === reminderId) {
          return {
            ...r,
            lastCompleted: Date.now(),
            nextDue: Date.now() + (r.frequencyDays * 24 * 60 * 60 * 1000)
          };
        }
        return r;
      })
    };
    await updatePlant(updatedPlant);
  };

  const getDueStatus = (nextDue: number) => {
    const now = Date.now();
    const diff = nextDue - now;
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    
    if (diff < 0) return { text: "Overdue", color: "text-red-400", urgent: true };
    if (days <= 0) return { text: "Due Today", color: "text-orange-400", urgent: true };
    if (days === 1) return { text: "Due Tomorrow", color: "text-emerald-400", urgent: false };
    return { text: `Due in ${days} days`, color: "text-gray-500", urgent: false };
  };

  const getReminderIcon = (type: string) => {
    switch(type) {
      case 'Water': return '💧';
      case 'Fertilize': return '💊';
      case 'Mist': return '🌫️';
      case 'Prune': return '✂️';
      default: return '⏰';
    }
  };

  if (loading) {
      return <div className="p-8 text-center text-gray-500">Loading your garden...</div>;
  }

  if (plants.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <div className="text-6xl mb-4 opacity-50 filter drop-shadow-lg">🍃</div>
        <h2 className="text-xl font-bold text-gray-300 mb-2">Your garden is empty</h2>
        <p className="text-gray-500 mb-6">Start by identifying a plant with your camera.</p>
        <button 
            onClick={() => onIdentify(AppTab.IDENTIFY)}
            className="bg-emerald-600 text-white px-6 py-3 rounded-full font-semibold shadow-lg shadow-emerald-900/50 active:scale-95 transition-transform"
        >
            Identify Plant
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 pb-24">
      <div className="flex justify-between items-center mb-4 px-2">
        <h2 className="text-2xl font-bold text-emerald-300 drop-shadow-md">My Garden</h2>
      </div>
      
      {plants.map((plant) => (
        <div 
            key={plant.id} 
            onClick={() => toggleExpand(plant.id)}
            className="bg-white/5 backdrop-blur-md rounded-2xl shadow-lg overflow-hidden border border-white/10 transition-all active:scale-[0.99] cursor-pointer hover:bg-white/10"
        >
          <div className="flex h-24">
            <img src={plant.imageUri} alt={plant.name} className="w-24 h-24 object-cover" />
            <div className="flex-1 p-3 flex flex-col justify-center">
              <h3 className="font-bold text-lg text-white leading-tight">{plant.name}</h3>
              <p className="text-xs text-gray-400 italic mb-1">{plant.scientificName}</p>
              {plant.care.lifespan && (
                <span className="inline-block bg-emerald-900/60 text-emerald-300 text-[10px] px-2 py-0.5 rounded-full font-medium border border-emerald-500/20 max-w-fit">
                    {plant.care.lifespan}
                </span>
              )}
              
              <div className="flex gap-1 mt-1">
                {plant.reminders?.map(r => {
                  const status = getDueStatus(r.nextDue);
                  if (status.urgent) {
                    return <span key={r.id} className="w-2 h-2 rounded-full bg-red-400 animate-pulse shadow-red-500/50 shadow-sm"></span>
                  }
                  return null;
                })}
              </div>
            </div>
            <div className="flex items-center pr-4">
                 <span className={`transform transition-transform text-gray-500 ${expandedId === plant.id ? 'rotate-180' : ''}`}>▼</span>
            </div>
          </div>

          {expandedId === plant.id && (
            <div 
                className="p-4 bg-black/20 border-t border-white/5 animate-fade-in text-sm space-y-4 cursor-default"
                onClick={(e) => e.stopPropagation()} 
            >
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div className="bg-white/5 p-3 rounded-lg border border-white/5">
                    <span className="font-bold text-blue-400 block mb-1">💧 Water</span>
                    <p className="text-gray-300">{plant.care.water}</p>
                 </div>
                 <div className="bg-white/5 p-3 rounded-lg border border-white/5">
                    <span className="font-bold text-yellow-400 block mb-1">☀️ Light</span>
                    <p className="text-gray-300">{plant.care.light}</p>
                 </div>
                 <div className="bg-white/5 p-3 rounded-lg border border-white/5">
                    <span className="font-bold text-green-400 block mb-1">🌡️ Temperature</span>
                    <p className="text-gray-300">{plant.care.temperature}</p>
                 </div>
                 <div className="bg-white/5 p-3 rounded-lg border border-white/5">
                     <span className="font-bold text-amber-500 block mb-1">🌱 Fertilizer</span>
                     <p className="text-gray-300">{plant.care.fertilizer}</p>
                 </div>
                 
                 {plant.care.pruning && (
                     <div className="bg-white/5 p-3 rounded-lg border border-white/5">
                        <span className="font-bold text-purple-400 block mb-1">✂️ Pruning</span>
                        <p className="text-gray-300">{plant.care.pruning}</p>
                     </div>
                 )}
                 {plant.care.toxicity && (
                     <div className="bg-white/5 p-3 rounded-lg border border-white/5 col-span-1 md:col-span-2">
                        <span className="font-bold text-orange-400 block mb-1">⚠️ Toxicity</span>
                        <p className="text-gray-300">{plant.care.toxicity}</p>
                     </div>
                 )}
               </div>

               <div className="border-t border-white/10 pt-4">
                  <div className="flex justify-between items-center mb-3">
                      <h4 className="font-bold text-emerald-300">🔔 Reminders</h4>
                      {!isAddingReminder && (
                          <button 
                            onClick={() => setIsAddingReminder(plant.id)}
                            className="text-xs bg-emerald-900/50 border border-emerald-500/30 text-emerald-300 px-2 py-1 rounded hover:bg-emerald-900"
                          >
                            + Add
                          </button>
                      )}
                  </div>

                  {isAddingReminder === plant.id && (
                      <div className="bg-white/10 p-3 rounded-lg shadow-inner mb-3 border border-white/10">
                          <div className="flex gap-2 mb-2">
                              <select 
                                value={reminderType} 
                                onChange={(e) => setReminderType(e.target.value)}
                                className="flex-1 p-2 rounded bg-gray-800 border border-gray-600 text-white"
                              >
                                  <option value="Water">Water 💧</option>
                                  <option value="Fertilize">Fertilize 💊</option>
                                  <option value="Mist">Mist 🌫️</option>
                                  <option value="Prune">Prune ✂️</option>
                                  <option value="Other">Other ⏰</option>
                              </select>
                          </div>
                          <div className="flex items-center gap-2 mb-3">
                              <span className="text-xs text-gray-300">Every</span>
                              <input 
                                type="number" 
                                min="1" 
                                value={reminderFreq} 
                                onChange={(e) => setReminderFreq(parseInt(e.target.value) || 1)}
                                className="w-16 p-2 rounded bg-gray-800 border border-gray-600 text-white"
                              />
                              <span className="text-xs text-gray-300">days</span>
                          </div>
                          <div className="flex justify-end gap-2">
                              <button 
                                onClick={() => setIsAddingReminder(null)}
                                className="text-xs text-gray-400"
                              >
                                Cancel
                              </button>
                              <button 
                                onClick={() => addReminder(plant.id)}
                                className="text-xs bg-emerald-600 text-white px-3 py-1 rounded hover:bg-emerald-500"
                              >
                                Save
                              </button>
                          </div>
                      </div>
                  )}

                  <div className="space-y-2">
                      {(!plant.reminders || plant.reminders.length === 0) && !isAddingReminder && (
                          <p className="text-xs text-gray-500 italic">No reminders set.</p>
                      )}
                      {plant.reminders?.map(reminder => {
                          const status = getDueStatus(reminder.nextDue);
                          return (
                              <div key={reminder.id} className="flex items-center justify-between bg-white/5 p-2 rounded-lg border border-white/5">
                                  <div className="flex items-center gap-2">
                                      <span className="text-lg">{getReminderIcon(reminder.type)}</span>
                                      <div>
                                          <p className="font-semibold text-gray-200">{reminder.type}</p>
                                          <p className={`text-xs font-bold ${status.color}`}>{status.text}</p>
                                      </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                      <button 
                                        onClick={() => completeReminder(plant.id, reminder.id)}
                                        className="w-8 h-8 rounded-full bg-green-900/30 text-green-400 flex items-center justify-center hover:bg-green-900/50 border border-green-900/50"
                                        title="Mark Done"
                                      >
                                          ✓
                                      </button>
                                      <button 
                                        onClick={() => deleteReminder(plant.id, reminder.id)}
                                        className="text-gray-500 hover:text-red-400"
                                      >
                                          🗑
                                      </button>
                                  </div>
                              </div>
                          );
                      })}
                  </div>
               </div>
               
               <div className="pt-2 flex justify-end">
                 <button 
                    onClick={(e) => handleDelete(plant.id, e)}
                    className="text-red-400 hover:text-red-300 text-xs font-bold uppercase tracking-wide px-3 py-2 opacity-70 hover:opacity-100"
                 >
                    Delete Plant
                 </button>
               </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};