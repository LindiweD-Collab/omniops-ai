'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation' 
import { supabase } from '@/lib/supabaseClient'
import { Loader2, CheckCircle, Send } from 'lucide-react'

export default function PublicFormView() {
  const params = useParams()
  const formId = params.id as string

  const [form, setForm] = useState<any>(null)
  const [answers, setAnswers] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    const fetchForm = async () => {
      if (!formId) return
      const { data, error } = await supabase
        .from('forms')
        .select('*')
        .eq('id', formId)
        .single()
      
      if (error) console.error(error)
      setForm(data)
      setLoading(false)
    }
    fetchForm()
  }, [formId])

  const handleInputChange = (fieldId: string, value: any) => {
    setAnswers(prev => ({ ...prev, [fieldId]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    const { error } = await supabase
      .from('submissions')
      .insert([
        { 
          form_id: formId, 
          data: answers 
        }
      ])

    if (!error) {
      setSubmitted(true)
    } else {
      alert("Error submitting form")
    }
    setSubmitting(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-400">
        <Loader2 className="animate-spin mr-2" /> Loading Form...
      </div>
    )
  }

  if (!form) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <h1 className="text-xl font-bold text-slate-800">Form Not Found</h1>
          <p className="text-slate-500 mt-2">This link might be invalid or expired.</p>
        </div>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-xl p-10 text-center border border-green-100">
          <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={32} />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Thank You!</h1>
          <p className="text-slate-500">Your submission for <span className="font-semibold text-slate-700">{form.title}</span> has been received.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 flex justify-center">
      <div className="max-w-xl w-full">

        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-slate-300">OmniOps Forms</h2>
        </div>

        <form onSubmit={handleSubmit} className="bg-white shadow-xl rounded-2xl overflow-hidden border border-slate-200">

          <div className="bg-slate-900 px-8 py-6">
            <h1 className="text-2xl font-bold text-white">{form.title}</h1>
            {form.description && <p className="text-slate-400 mt-2 text-sm">{form.description}</p>}
          </div>

          <div className="p-8 space-y-6">
            {form.fields && form.fields.map((field: any) => (
              <div key={field.id} className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700">
                  {field.label}
                </label>

                {field.type === 'text' && (
                  <input
                    required
                    type="text"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-slate-50 focus:bg-white"
                    placeholder="Type here..."
                    onChange={(e) => handleInputChange(field.id, e.target.value)}
                  />
                )}

                {field.type === 'textarea' && (
                  <textarea
                    required
                    rows={4}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-slate-50 focus:bg-white resize-none"
                    placeholder="Type details here..."
                    onChange={(e) => handleInputChange(field.id, e.target.value)}
                  />
                )}

                {field.type === 'checkbox' && (
                  <div className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer">
                    <input
                      id={field.id}
                      type="checkbox"
                      className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
                      onChange={(e) => handleInputChange(field.id, e.target.checked)}
                    />
                    <label htmlFor={field.id} className="text-slate-700 cursor-pointer select-none">
                      Yes, select this option
                    </label>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="bg-slate-50 px-8 py-6 border-t border-slate-100 flex justify-end">
            <button 
              type="submit" 
              disabled={submitting}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 px-6 rounded-lg shadow-lg shadow-indigo-200 transition-all flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {submitting ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
              {submitting ? 'Sending...' : 'Submit Form'}
            </button>
          </div>
        </form>

        <div className="text-center mt-6 text-xs text-slate-400">
          Powered by OmniOps AI
        </div>
      </div>
    </div>
  )
}