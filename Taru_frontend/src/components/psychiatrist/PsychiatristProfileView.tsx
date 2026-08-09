import { Stethoscope, Mail, Calendar, Globe, BookOpen, Award, Briefcase } from 'lucide-react'
import { COLORS } from '../../lib/theme'
import { Psychiatrist } from '../../types'

interface Props {
  psychiatrist: Psychiatrist
}

export default function PsychiatristProfileView({ psychiatrist }: Props) {
  return (
    <div>
      <h1 className="text-2xl font-extrabold mb-6" style={{ color: COLORS.fg }}>Practitioner Profile</h1>
      
      <div className="rounded-2xl p-8 border shadow-sm" style={{ background: COLORS.card, borderColor: COLORS.border }}>
        <div className="flex items-start gap-6 mb-8">
          <div className="w-20 h-20 rounded-full flex items-center justify-center font-bold text-3xl shrink-0" 
            style={{ background: COLORS.muted, color: COLORS.fg }}>
            {psychiatrist.name[0]}
          </div>
          <div className="flex-1 pt-2">
            <h2 className="text-2xl font-bold" style={{ color: COLORS.fg }}>{psychiatrist.name}</h2>
            <div className="text-sm mt-1 flex items-center gap-1.5" style={{ color: COLORS.fg2 }}>
              <Award size={14} /> {psychiatrist.qualification}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div>
              <div className="text-xs font-bold mb-2 uppercase tracking-wider" style={{ color: COLORS.fg3 }}>Contact & Info</div>
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm" style={{ color: COLORS.fg }}>
                  <Mail size={16} style={{ color: COLORS.fg3 }} />
                  {psychiatrist.email}
                </div>
                {psychiatrist.experience && (
                  <div className="flex items-center gap-3 text-sm" style={{ color: COLORS.fg }}>
                    <Briefcase size={16} style={{ color: COLORS.fg3 }} />
                    {psychiatrist.experience} years of experience
                  </div>
                )}
                <div className="flex items-center gap-3 text-sm" style={{ color: COLORS.fg }}>
                  <Calendar size={16} style={{ color: COLORS.fg3 }} />
                  Member since {new Date(psychiatrist.createdAt || Date.now()).toLocaleDateString()}
                </div>
              </div>
            </div>

            {psychiatrist.languages && psychiatrist.languages.length > 0 && (
              <div>
                <div className="text-xs font-bold mb-2 uppercase tracking-wider flex items-center gap-1.5" style={{ color: COLORS.fg3 }}>
                  <Globe size={14} /> Languages
                </div>
                <div className="flex flex-wrap gap-2">
                  {psychiatrist.languages.map(lang => (
                    <span key={lang} className="text-xs font-semibold px-2.5 py-1 rounded-md bg-gray-100" style={{ color: COLORS.fg2 }}>
                      {lang}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6">
            {psychiatrist.specialization && psychiatrist.specialization.length > 0 && (
              <div>
                <div className="text-xs font-bold mb-2 uppercase tracking-wider flex items-center gap-1.5" style={{ color: COLORS.fg3 }}>
                  <Stethoscope size={14} /> Specialization
                </div>
                <div className="flex flex-wrap gap-2">
                  {psychiatrist.specialization.map(spec => (
                    <span key={spec} className="text-xs font-semibold px-3 py-1 rounded-full border" 
                      style={{ borderColor: COLORS.border, color: COLORS.fg, background: COLORS.bg }}>
                      {spec}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {psychiatrist.bio && (
              <div>
                <div className="text-xs font-bold mb-2 uppercase tracking-wider flex items-center gap-1.5" style={{ color: COLORS.fg3 }}>
                  <BookOpen size={14} /> Bio
                </div>
                <p className="text-sm leading-relaxed" style={{ color: COLORS.fg2 }}>
                  {psychiatrist.bio}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
