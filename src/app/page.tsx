'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { generateAIContent } from '@/app/actions/ai'
import { 
  LayoutDashboard, Users, FileText, Bot, Plus, Trash2, 
  Save, Check, Loader2, FormInput, ExternalLink, Inbox, Calendar,
  ArrowRight, ArrowLeft 
} from 'lucide-react'

type FormField = { label: string; type: 'text' | 'textarea' | 'checkbox'; id: string }
type Item = { id: string; title: string; description: string; status: string; category: string }
type Submission = { id: string; form_id: string; data: Record<string, any>; created_at: string; form_title?: string }

export default function Dashboard() {

  const [view, setView] = useState('dashboard')
  const [items, setItems] = useState<Item[]>([])
  const [loadingAI, setLoadingAI] = useState(false)
  const [newItemTitle, setNewItemTitle] = useState('')
  const [forms, setForms] = useState<any[]>([])
  const [currentFormFields, setCurrentFormFields] = useState<FormField[]>([])
  const [formTitle, setFormTitle] = useState('')

  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null)

  useEffect(() => {
    fetchItems()
    fetchForms()
    fetchSubmissions()
  }, [])

  const fetchItems = async () => {

    let { data } = await supabase.from('items').select('*').order('created_at', { ascending: false })
    if (data) setItems(data)
  }

  const fetchForms = async () => {
    let { data } = await supabase.from('forms').select('*')
    if (data) setForms(data)
  }

  const fetchSubmissions = async () => {
    let { data, error } = await supabase
      .from('submissions')
      .select(`*, forms ( title, fields )`)
      .order('created_at', { ascending: false })

    if (error) console.error(error)
    
    if (data) {
      const formatted = data.map((sub: any) => ({
        ...sub,
        form_title: sub.forms?.title,
        form_fields: sub.forms?.fields
      }))
      setSubmissions(formatted)
    }
  }

  const handleCreateItem = async (withAI: boolean) => {
    if (!newItemTitle) return
    setLoadingAI(true)

    let description = ''
    if (withAI) {
      try {
        description = await generateAIContent(
          newItemTitle, 
          view === 'crm' ? "Generate a sales lead qualification checklist." : "Create a brief execution plan for this software task."
        )
      } catch (e) {
        description = "AI unavailable (Check API Key)"
      }
    }

    const category = view === 'crm' ? 'lead' : 'task'
    const status = view === 'crm' ? 'lead-new' : 'todo'

    const { data } = await supabase
      .from('items')
      .insert([{ title: newItemTitle, description, category, status }])
      .select()

    if (data) setItems([data[0], ...items]) 
    setNewItemTitle('')
    setLoadingAI(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this?")) return

    setItems(items.filter(i => i.id !== id))

    await supabase.from('items').delete().eq('id', id)
  }

  const handleMove = async (item: Item, direction: 'next' | 'prev') => {
    const pipeline = ['lead-new', 'negotiation', 'lead-won']
    const currentIndex = pipeline.indexOf(item.status)
    
    let newStatus = item.status

    if (direction === 'next' && currentIndex < pipeline.length - 1) {
      newStatus = pipeline[currentIndex + 1]
    } else if (direction === 'prev' && currentIndex > 0) {
      newStatus = pipeline[currentIndex - 1]
    }

    if (newStatus !== item.status) {

      setItems(items.map(i => i.id === item.id ? { ...i, status: newStatus } : i))
      await supabase.from('items').update({ status: newStatus }).eq('id', item.id)
    }
  }

  const toggleTaskStatus = async (item: Item) => {
    const newStatus = item.status === 'done' ? 'todo' : 'done'
    setItems(items.map(i => i.id === item.id ? { ...i, status: newStatus } : i))
    await supabase.from('items').update({ status: newStatus }).eq('id', item.id)
  }

  const addFieldToForm = (type: 'text' | 'textarea' | 'checkbox') => {
    setCurrentFormFields([...currentFormFields, { label: 'New Field', type, id: crypto.randomUUID() }])
  }

  const updateFieldLabel = (id: string, newLabel: string) => {
    setCurrentFormFields(currentFormFields.map(f => f.id === id ? { ...f, label: newLabel } : f))
  }

  const saveForm = async () => {
    if (!formTitle) return alert("Please name your form")
    
    await supabase.from('forms').insert([{ 
      title: formTitle, 
      fields: currentFormFields 
    }])
    
    setFormTitle('')
    setCurrentFormFields([])
    fetchForms()
    alert("Form Saved!")
  }

  return (
    <div className="flex h-screen bg-slate-50 text-slate-800 font-sans">

      <aside className="w-64 bg-slate-900 text-white flex flex-col shadow-2xl z-10">
        <div className="p-6">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
            OmniOps
          </h1>
          <p className="text-xs text-slate-400 mt-1">Enterprise Automation</p>
        </div>
        
        <nav className="flex-1 px-4 space-y-2">
          <NavButton active={view === 'dashboard'} onClick={() => setView('dashboard')} icon={<LayoutDashboard size={18} />} label="Operations" />
          <NavButton active={view === 'crm'} onClick={() => setView('crm')} icon={<Users size={18} />} label="CRM Pipeline" />
          <NavButton active={view === 'forms'} onClick={() => setView('forms')} icon={<FormInput size={18} />} label="Form Builder" />
          <NavButton active={view === 'inbox'} onClick={() => { setView('inbox'); fetchSubmissions() }} icon={<Inbox size={18} />} label="Inbox" />
          <NavButton active={view === 'ai-docs'} onClick={() => setView('ai-docs')} icon={<Bot size={18} />} label="AI Agents" />
        </nav>

        <div className="p-4 bg-slate-800 m-4 rounded-xl">
          <div className="text-xs text-slate-400 mb-2">Usage Limit</div>
          <div className="h-1 w-full bg-slate-700 rounded-full overflow-hidden">
            <div className="h-full bg-indigo-500 w-1/3"></div>
          </div>
        </div>
      </aside>

      <main className="flex-1 p-8 overflow-y-auto">

        <header className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-bold text-slate-900 capitalize tracking-tight">{view.replace('-', ' ')}</h2>
            <p className="text-slate-500">Manage your workspace efficiently.</p>
          </div>
          
          {(view === 'dashboard' || view === 'crm') && (
            <div className="flex gap-3 bg-white p-1 rounded-lg shadow-sm border border-slate-200">
              <input 
                type="text" 
                placeholder={view === 'crm' ? "New Lead Name..." : "New Task..."}
                className="p-2 outline-none w-64 text-sm"
                value={newItemTitle}
                onChange={(e) => setNewItemTitle(e.target.value)}
              />
              <button onClick={() => handleCreateItem(false)} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-md transition-colors text-sm font-medium">
                Add
              </button>
              <button onClick={() => handleCreateItem(true)} disabled={loadingAI} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md transition-colors flex items-center gap-2 text-sm font-medium disabled:opacity-50">
                {loadingAI ? <Loader2 className="animate-spin" size={16}/> : <Bot size={16}/>}
                {loadingAI ? 'Generating...' : 'AI Auto-Fill'}
              </button>
            </div>
          )}
        </header>

        {view === 'dashboard' && (
          <div className="grid grid-cols-1 gap-4">
            {items.filter(i => i.category === 'task').map(item => (
              <div key={item.id} className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-all flex justify-between items-start group">
                <div className="flex-1 flex gap-4">

                  <button 
                    onClick={() => toggleTaskStatus(item)}
                    className={`mt-1 w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${item.status === 'done' ? 'bg-green-500 border-green-500 text-white' : 'border-slate-300 hover:border-indigo-500'}`}
                  >
                    {item.status === 'done' && <Check size={12}/>}
                  </button>
                  <div>
                    <h3 className={`font-semibold text-lg text-slate-800 ${item.status === 'done' ? 'line-through text-slate-400' : ''}`}>{item.title}</h3>
                    <p className="mt-2 text-slate-600 text-sm whitespace-pre-wrap">{item.description}</p>
                  </div>
                </div>

                <button onClick={() => handleDelete(item.id)} className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition-all">
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
            {items.filter(i => i.category === 'task').length === 0 && (
              <div className="text-center py-20 text-slate-400 bg-white rounded-xl border border-dashed">No active tasks. Use AI to generate a plan!</div>
            )}
          </div>
        )}

        {view === 'crm' && (
          <div className="flex gap-6 h-[calc(100vh-200px)] overflow-x-auto pb-4">
            {['lead-new', 'negotiation', 'lead-won'].map(status => (
              <div key={status} className="min-w-[320px] bg-slate-100 rounded-xl p-4 flex flex-col">
                <div className="flex justify-between items-center mb-4 px-2">
                  <span className="uppercase text-xs font-bold text-slate-500 tracking-wider">{status.replace('lead-', '').replace('-', ' ')}</span>
                  <span className="bg-slate-200 text-slate-600 text-xs px-2 py-1 rounded-full">
                    {items.filter(i => i.category === 'lead' && i.status === status).length}
                  </span>
                </div>
                <div className="space-y-3 overflow-y-auto flex-1 pr-2 custom-scrollbar">
                  {items.filter(i => i.category === 'lead' && i.status === status).map(item => (
                    <div key={item.id} className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm hover:shadow-md transition-all">
                      
                      <div className="font-bold text-slate-800 mb-1">{item.title}</div>
                      
                      {item.description && (
                        <div className="text-xs bg-indigo-50 text-indigo-700 p-2 rounded mt-2 border border-indigo-100">
                          <Bot size={12} className="inline mr-1 mb-0.5"/>
                          {item.description.slice(0, 100)}...
                        </div>
                      )}

                      <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center">
                         <button 
                           onClick={() => handleDelete(item.id)}
                           className="text-slate-400 hover:text-red-500 transition-colors p-1" title="Delete Lead"
                         >
                           <Trash2 size={14}/>
                         </button>
                         
                         <div className="flex gap-2">
                           {status !== 'lead-new' && (
                             <button 
                               onClick={() => handleMove(item, 'prev')}
                               className="bg-slate-100 hover:bg-slate-200 text-slate-600 p-1.5 rounded text-xs flex items-center gap-1"
                             >
                               <ArrowLeft size={12}/> Back
                             </button>
                           )}
                           {status !== 'lead-won' && (
                             <button 
                               onClick={() => handleMove(item, 'next')}
                               className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 p-1.5 rounded text-xs flex items-center gap-1 font-medium"
                             >
                               Next <ArrowRight size={12}/>
                             </button>
                           )}
                         </div>
                      </div>

                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {view === 'forms' && (
          <div className="flex gap-8 h-full">
            <div className="w-1/3 flex flex-col gap-6">

              <div className="bg-white rounded-xl shadow-lg border border-slate-200 flex flex-col flex-1">
                <div className="p-5 border-b border-slate-100">
                  <h3 className="font-bold text-lg mb-4">Form Editor</h3>
                  <input 
                    className="w-full text-xl font-bold placeholder-slate-300 border-none focus:ring-0 px-0" 
                    placeholder="Untitled Form"
                    value={formTitle}
                    onChange={e => setFormTitle(e.target.value)}
                  />
                </div>
                <div className="p-5 flex-1 overflow-y-auto space-y-4">
                  {currentFormFields.map((field, idx) => (
                    <div key={field.id} className="bg-slate-50 p-3 rounded-lg border border-slate-200 group">
                      <div className="flex justify-between mb-2">
                        <span className="text-xs font-mono uppercase text-slate-400">{field.type}</span>
                        <button onClick={() => setCurrentFormFields(currentFormFields.filter(f => f.id !== field.id))} className="text-red-400 hover:text-red-600"><Trash2 size={14}/></button>
                      </div>
                      <input 
                        value={field.label} 
                        onChange={(e) => updateFieldLabel(field.id, e.target.value)}
                        className="bg-transparent w-full font-medium focus:outline-none border-b border-transparent focus:border-indigo-500"
                      />
                    </div>
                  ))}
                  
                  <div className="grid grid-cols-3 gap-2 mt-4">
                    <ToolBtn icon={<FormInput size={16}/>} label="Text" onClick={() => addFieldToForm('text')} />
                    <ToolBtn icon={<FileText size={16}/>} label="Area" onClick={() => addFieldToForm('textarea')} />
                    <ToolBtn icon={<Check size={16}/>} label="Check" onClick={() => addFieldToForm('checkbox')} />
                  </div>
                </div>
                <div className="p-5 border-t border-slate-100 bg-slate-50 rounded-b-xl">
                  <button onClick={saveForm} className="w-full bg-slate-900 text-white py-3 rounded-lg font-medium hover:bg-black flex justify-center items-center gap-2">
                    <Save size={18} /> Save Form
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                <h4 className="font-bold text-sm text-slate-500 uppercase mb-3">Your Saved Forms</h4>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {forms.map(form => (
                    <div key={form.id} className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-100">
                      <span className="font-medium text-sm truncate w-24">{form.title}</span>
                      <a 
                        href={`/forms/${form.id}`} 
                        target="_blank" 
                        className="text-indigo-600 text-xs hover:underline flex items-center gap-1"
                      >
                        <ExternalLink size={12}/> Link
                      </a>
                    </div>
                  ))}
                  {forms.length === 0 && <div className="text-xs text-slate-400 italic">No forms created yet.</div>}
                </div>
              </div>
            </div>

            <div className="flex-1 bg-slate-100 rounded-xl p-8 flex flex-col items-center justify-center border-2 border-dashed border-slate-300">
              <div className="w-full max-w-md bg-white shadow-xl rounded-xl p-8 min-h-[400px]">
                 <div className="mb-6">
                   <h1 className="text-2xl font-bold">{formTitle || "Form Preview"}</h1>
                   <p className="text-slate-500 text-sm mt-1">This is how your clients will see the form.</p>
                 </div>
                 <div className="space-y-5">
                   {currentFormFields.length === 0 && <div className="text-center text-slate-300 py-10">Add fields from the left panel</div>}
                   {currentFormFields.map(f => (
                     <div key={f.id}>
                       <label className="block text-sm font-medium text-slate-700 mb-1">{f.label}</label>
                       {f.type === 'text' && <input className="w-full border rounded-md p-2 bg-slate-50" disabled placeholder="Short text answer..." />}
                       {f.type === 'textarea' && <textarea className="w-full border rounded-md p-2 bg-slate-50 h-24" disabled placeholder="Long answer..." />}
                       {f.type === 'checkbox' && <div className="flex items-center gap-2"><input type="checkbox" disabled /> <span className="text-sm text-slate-500">Select this option</span></div>}
                     </div>
                   ))}
                 </div>
              </div>
            </div>
          </div>
        )}

        {view === 'inbox' && (
          <div className="flex gap-6 h-full">

            <div className="w-1/3 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
               <div className="p-4 border-b border-slate-100 bg-slate-50">
                 <h3 className="font-bold text-slate-700">Recent Submissions</h3>
               </div>
               <div className="overflow-y-auto flex-1">
                 {submissions.length === 0 && (
                   <div className="p-8 text-center text-slate-400 text-sm">No submissions yet.</div>
                 )}
                 {submissions.map(sub => (
                   <div 
                     key={sub.id} 
                     onClick={() => setSelectedSubmission(sub)}
                     className={`p-4 border-b border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors ${selectedSubmission?.id === sub.id ? 'bg-indigo-50 border-indigo-100' : ''}`}
                   >
                     <div className="flex justify-between items-start mb-1">
                        <span className="font-semibold text-slate-800">{sub.form_title}</span>
                        <span className="text-xs text-slate-400">{new Date(sub.created_at).toLocaleDateString()}</span>
                     </div>
                     <div className="text-xs text-slate-500 truncate">
                        ID: {sub.id.slice(0, 8)}...
                     </div>
                   </div>
                 ))}
               </div>
            </div>

            <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 p-8 overflow-y-auto">
               {!selectedSubmission ? (
                 <div className="h-full flex flex-col items-center justify-center text-slate-300">
                    <Inbox size={48} className="mb-4 opacity-50"/>
                    <p>Select a submission to view details</p>
                 </div>
               ) : (
                 <div>
                    <div className="flex justify-between items-start border-b border-slate-100 pb-6 mb-6">
                      <div>
                        <h2 className="text-2xl font-bold text-slate-800">{selectedSubmission.form_title}</h2>
                        <div className="flex items-center gap-2 text-slate-500 mt-2 text-sm">
                          <Calendar size={14}/> 
                          Submitted on {new Date(selectedSubmission.created_at).toLocaleString()}
                        </div>
                      </div>
                      <div className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide">
                        New Submission
                      </div>
                    </div>

                    <div className="space-y-6">

                      {(selectedSubmission as any).form_fields?.map((field: any) => {
                        const answer = selectedSubmission.data[field.id]
                        return (
                          <div key={field.id} className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                            <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">{field.label}</h4>
                            <div className="text-slate-900 font-medium">
                              {answer === true ? <Check className="text-green-500" size={20}/> : (answer || <span className="text-slate-400 italic">No answer</span>)}
                            </div>
                          </div>
                        )
                      })}
                     
                      {!(selectedSubmission as any).form_fields && (
                        <div className="text-red-400 text-sm">
                          Form definition missing or changed. Raw Data: {JSON.stringify(selectedSubmission.data)}
                        </div>
                      )}
                    </div>
                 </div>
               )}
            </div>
          </div>
        )}

      </main>
    </div>
  )
}

function NavButton({ active, onClick, icon, label }: any) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
        active 
          ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20' 
          : 'text-slate-400 hover:bg-slate-800 hover:text-white'
      }`}
    >
      {icon}
      <span className="font-medium text-sm">{label}</span>
    </button>
  )
}

function ToolBtn({ icon, label, onClick }: any) {
  return (
    <button onClick={onClick} className="flex flex-col items-center justify-center p-3 bg-white border border-slate-200 rounded-lg hover:border-indigo-500 hover:text-indigo-600 transition-all shadow-sm">
      {icon}
      <span className="text-xs font-medium mt-1">{label}</span>
    </button>
  )
}