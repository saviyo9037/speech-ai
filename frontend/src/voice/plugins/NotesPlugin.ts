import { VoicePlugin, PluginContext, PluginExecutionResult } from '../types';

export class NotesPlugin implements VoicePlugin {
  public id = 'notes';
  public name = 'Notes Manager';
  public description = 'Manages short notes in local memory storage.';
  public intents = ['notes_add', 'notes_read', 'notes_delete', 'notes_list'];

  public async execute(
    intent: string,
    parameters: Record<string, any>,
    context: PluginContext
  ): Promise<PluginExecutionResult> {
    if (intent === 'notes_add') {
      const content = String(parameters.content || '').trim();
      if (!content) {
        return {
          success: false,
          message: 'Please specify the note content.'
        };
      }
      const note = context.addNote(content);
      return {
        success: true,
        message: `I have saved your note: "${content}".`,
        data: { note }
      };
    }

    if (intent === 'notes_list') {
      const notes = context.getNotes();
      if (notes.length === 0) {
        return {
          success: true,
          message: 'You do not have any notes saved.',
          data: { notes }
        };
      }
      const notesText = notes.map((n, idx) => `Note ${idx + 1}, ${n.content}`).join('. ');
      return {
        success: true,
        message: `You have ${notes.length} notes: ${notesText}`,
        data: { notes }
      };
    }

    if (intent === 'notes_delete') {
      const targetId = parameters.id;
      if (targetId === undefined || targetId === null || targetId === '') {
        return {
          success: false,
          message: 'Please specify which note ID or index to delete.'
        };
      }

      const success = context.deleteNote(targetId);
      if (success) {
        return {
          success: true,
          message: `Deleted note ${targetId}.`,
          data: { id: targetId }
        };
      }
      return {
        success: false,
        message: `Could not find note matching ${targetId}.`
      };
    }

    if (intent === 'notes_read') {
      const query = String(parameters.query || '').toLowerCase().trim();
      const notes = context.getNotes();

      if (query) {
        const matches = notes.filter(n => n.content.toLowerCase().includes(query));
        if (matches.length === 0) {
          return {
            success: true,
            message: `No notes matched the query "${query}".`
          };
        }
        const matchText = matches.map((n, idx) => `Match ${idx + 1}, ${n.content}`).join('. ');
        return {
          success: true,
          message: `Found ${matches.length} matching notes: ${matchText}`,
          data: { notes: matches }
        };
      } else {
        if (notes.length === 0) {
          return {
            success: true,
            message: 'You do not have any notes.'
          };
        }
        const last = notes[notes.length - 1];
        return {
          success: true,
          message: `Your most recent note says: "${last.content}".`,
          data: { note: last }
        };
      }
    }

    return {
      success: false,
      message: `Unsupported notes operation: ${intent}`
    };
  }
}
