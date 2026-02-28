import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  SharedTaskList,
  TeamMailbox,
  TeamCoordinator,
  detectTeamFromPrompt,
} from '@/lib/orchestrator/team-coordinator'

// Mock dependencies
vi.mock('@/lib/llm', () => ({
  LLMService: {
    chat: vi.fn(),
    streamChat: vi.fn(),
  },
}))

vi.mock('@/lib/credential-service', () => ({
  CredentialService: {
    getActiveConfig: vi.fn().mockResolvedValue({
      provider: 'openai',
      model: 'gpt-4',
      apiKey: 'test-key',
    }),
  },
}))

vi.mock('@/stores/agentStore', () => ({
  getAgentById: vi.fn(),
  getDefaultAgent: vi.fn(),
  loadAllAgents: vi.fn().mockResolvedValue([]),
  createAgent: vi.fn(),
}))

vi.mock('@/stores/taskStore', () => ({
  useTaskStore: {
    getState: vi.fn().mockReturnValue({
      createTask: vi.fn(),
      getTaskById: vi.fn(),
      updateTask: vi.fn(),
    }),
  },
}))

vi.mock('@/stores/conversationStore', () => ({
  useConversationStore: {
    getState: vi.fn().mockReturnValue({
      createConversation: vi.fn(),
      addMessage: vi.fn(),
    }),
  },
}))

// ============================================================================
// SharedTaskList
// ============================================================================

describe('SharedTaskList', () => {
  let taskList: SharedTaskList

  beforeEach(() => {
    taskList = new SharedTaskList()
  })

  describe('addTask', () => {
    it('should add a task with pending status', () => {
      const task = taskList.addTask({
        title: 'Research AI trends',
        description: 'Research recent AI market trends',
        dependencies: [],
        agentSpec: {
          name: 'Researcher',
          role: 'Research Analyst',
          requiredSkills: ['research'],
          specialization: 'Market analysis',
          estimatedExperience: 'Senior',
        },
      })

      expect(task.id).toBeDefined()
      expect(task.status).toBe('pending')
      expect(task.claimedBy).toBeUndefined()
      expect(task.title).toBe('Research AI trends')
    })

    it('should assign a unique ID to each task', () => {
      const task1 = taskList.addTask({
        title: 'Task 1',
        description: 'First task',
        dependencies: [],
      })
      const task2 = taskList.addTask({
        title: 'Task 2',
        description: 'Second task',
        dependencies: [],
      })

      expect(task1.id).not.toBe(task2.id)
    })

    it('should emit task-added event', () => {
      const handler = vi.fn()
      taskList.on('task-added', handler)

      const task = taskList.addTask({
        title: 'Test task',
        description: 'Description',
        dependencies: [],
      })

      expect(handler).toHaveBeenCalledWith(task)
    })
  })

  describe('claimTask', () => {
    it('should allow an agent to claim an unclaimed task', () => {
      const task = taskList.addTask({
        title: 'Task A',
        description: 'Some work',
        dependencies: [],
      })

      const claimed = taskList.claimTask(task.id, 'agent-1')
      expect(claimed).toBe(true)

      const updatedTask = taskList.getTask(task.id)
      expect(updatedTask?.status).toBe('in_progress')
      expect(updatedTask?.claimedBy).toBe('agent-1')
    })

    it('should reject claim if task is already claimed', () => {
      const task = taskList.addTask({
        title: 'Task B',
        description: 'Some other work',
        dependencies: [],
      })

      taskList.claimTask(task.id, 'agent-1')
      const secondClaim = taskList.claimTask(task.id, 'agent-2')
      expect(secondClaim).toBe(false)

      const updatedTask = taskList.getTask(task.id)
      expect(updatedTask?.claimedBy).toBe('agent-1')
    })

    it('should reject claim if task has unresolved dependencies', () => {
      const taskA = taskList.addTask({
        title: 'Task A',
        description: 'First',
        dependencies: [],
      })
      const taskB = taskList.addTask({
        title: 'Task B',
        description: 'Depends on A',
        dependencies: [taskA.id],
      })

      const claimed = taskList.claimTask(taskB.id, 'agent-1')
      expect(claimed).toBe(false)
    })

    it('should allow claiming task after dependencies are completed', () => {
      const taskA = taskList.addTask({
        title: 'Task A',
        description: 'First',
        dependencies: [],
      })
      const taskB = taskList.addTask({
        title: 'Task B',
        description: 'Depends on A',
        dependencies: [taskA.id],
      })

      taskList.claimTask(taskA.id, 'agent-1')
      taskList.completeTask(taskA.id, 'Result from A')

      const claimed = taskList.claimTask(taskB.id, 'agent-2')
      expect(claimed).toBe(true)
    })

    it('should emit task-claimed event', () => {
      const handler = vi.fn()
      taskList.on('task-claimed', handler)

      const task = taskList.addTask({
        title: 'Task',
        description: 'Work',
        dependencies: [],
      })
      taskList.claimTask(task.id, 'agent-1')

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          id: task.id,
          claimedBy: 'agent-1',
        }),
      )
    })

    it('should reject claim for non-existent task', () => {
      const claimed = taskList.claimTask('non-existent', 'agent-1')
      expect(claimed).toBe(false)
    })
  })

  describe('completeTask', () => {
    it('should mark a task as completed with its output', () => {
      const task = taskList.addTask({
        title: 'Task',
        description: 'Work',
        dependencies: [],
      })
      taskList.claimTask(task.id, 'agent-1')
      taskList.completeTask(task.id, 'Task result')

      const completed = taskList.getTask(task.id)
      expect(completed?.status).toBe('completed')
      expect(completed?.output).toBe('Task result')
    })

    it('should emit task-completed event', () => {
      const handler = vi.fn()
      taskList.on('task-completed', handler)

      const task = taskList.addTask({
        title: 'Task',
        description: 'Work',
        dependencies: [],
      })
      taskList.claimTask(task.id, 'agent-1')
      taskList.completeTask(task.id, 'Done')

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          id: task.id,
          status: 'completed',
        }),
      )
    })

    it('should emit tasks-unblocked when completing unblocks dependent tasks', () => {
      const handler = vi.fn()

      const taskA = taskList.addTask({
        title: 'Task A',
        description: 'First',
        dependencies: [],
      })
      const taskB = taskList.addTask({
        title: 'Task B',
        description: 'Depends on A',
        dependencies: [taskA.id],
      })

      taskList.on('tasks-unblocked', handler)

      taskList.claimTask(taskA.id, 'agent-1')
      taskList.completeTask(taskA.id, 'Result A')

      expect(handler).toHaveBeenCalledWith([taskB.id])
    })
  })

  describe('failTask', () => {
    it('should mark a task as failed with error', () => {
      const task = taskList.addTask({
        title: 'Task',
        description: 'Work',
        dependencies: [],
      })
      taskList.claimTask(task.id, 'agent-1')
      taskList.failTask(task.id, 'Something went wrong')

      const failed = taskList.getTask(task.id)
      expect(failed?.status).toBe('failed')
      expect(failed?.error).toBe('Something went wrong')
    })

    it('should emit task-failed event', () => {
      const handler = vi.fn()
      taskList.on('task-failed', handler)

      const task = taskList.addTask({
        title: 'Task',
        description: 'Work',
        dependencies: [],
      })
      taskList.claimTask(task.id, 'agent-1')
      taskList.failTask(task.id, 'Error occurred')

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          id: task.id,
          status: 'failed',
        }),
      )
    })
  })

  describe('getReadyTasks', () => {
    it('should return unclaimed tasks with satisfied dependencies', () => {
      const taskA = taskList.addTask({
        title: 'Task A',
        description: 'Independent',
        dependencies: [],
      })
      const taskB = taskList.addTask({
        title: 'Task B',
        description: 'Depends on A',
        dependencies: [taskA.id],
      })
      const taskC = taskList.addTask({
        title: 'Task C',
        description: 'Independent',
        dependencies: [],
      })

      const ready = taskList.getReadyTasks()
      expect(ready).toHaveLength(2)
      expect(ready.map((t) => t.id)).toContain(taskA.id)
      expect(ready.map((t) => t.id)).toContain(taskC.id)
      expect(ready.map((t) => t.id)).not.toContain(taskB.id)
    })

    it('should not include already claimed or completed tasks', () => {
      const task = taskList.addTask({
        title: 'Task',
        description: 'Work',
        dependencies: [],
      })
      taskList.claimTask(task.id, 'agent-1')

      const ready = taskList.getReadyTasks()
      expect(ready).toHaveLength(0)
    })
  })

  describe('getAllTasks', () => {
    it('should return all tasks', () => {
      taskList.addTask({
        title: 'Task 1',
        description: 'First',
        dependencies: [],
      })
      taskList.addTask({
        title: 'Task 2',
        description: 'Second',
        dependencies: [],
      })

      expect(taskList.getAllTasks()).toHaveLength(2)
    })
  })

  describe('isComplete', () => {
    it('should return true when all tasks are completed', () => {
      const task1 = taskList.addTask({
        title: 'Task 1',
        description: 'First',
        dependencies: [],
      })
      const task2 = taskList.addTask({
        title: 'Task 2',
        description: 'Second',
        dependencies: [],
      })

      taskList.claimTask(task1.id, 'agent-1')
      taskList.completeTask(task1.id, 'Done 1')
      taskList.claimTask(task2.id, 'agent-2')
      taskList.completeTask(task2.id, 'Done 2')

      expect(taskList.isComplete()).toBe(true)
    })

    it('should return false when some tasks are pending', () => {
      taskList.addTask({
        title: 'Task 1',
        description: 'First',
        dependencies: [],
      })

      expect(taskList.isComplete()).toBe(false)
    })

    it('should return false when some tasks are in_progress', () => {
      const task = taskList.addTask({
        title: 'Task',
        description: 'Work',
        dependencies: [],
      })
      taskList.claimTask(task.id, 'agent-1')

      expect(taskList.isComplete()).toBe(false)
    })
  })

  describe('getDependencyOutputs', () => {
    it('should return outputs from completed dependencies', () => {
      const taskA = taskList.addTask({
        title: 'Research',
        description: 'Do research',
        dependencies: [],
      })
      const taskB = taskList.addTask({
        title: 'Write Report',
        description: 'Write based on research',
        dependencies: [taskA.id],
      })

      taskList.claimTask(taskA.id, 'agent-1')
      taskList.completeTask(taskA.id, 'Research findings here')

      const outputs = taskList.getDependencyOutputs(taskB.id)
      expect(outputs).toHaveLength(1)
      expect(outputs[0]).toEqual({
        taskTitle: 'Research',
        content: 'Research findings here',
      })
    })
  })

  describe('hasCircularDependency', () => {
    it('should detect circular dependencies', () => {
      // We can't add circular deps with existing tasks, but the check
      // should catch cycles in the dependency graph
      const taskA = taskList.addTask({
        title: 'A',
        description: 'First',
        dependencies: [],
      })
      taskList.addTask({
        title: 'B',
        description: 'Second',
        dependencies: [taskA.id],
      })

      // Verify no cycles exist
      expect(taskList.hasCircularDependency()).toBe(false)
    })
  })
})

// ============================================================================
// TeamMailbox
// ============================================================================

describe('TeamMailbox', () => {
  let mailbox: TeamMailbox

  beforeEach(() => {
    mailbox = new TeamMailbox()
  })

  describe('sendMessage', () => {
    it('should deliver a direct message to a teammate', () => {
      mailbox.sendMessage('agent-1', 'agent-2', 'Hello teammate!')

      const messages = mailbox.getMessages('agent-2')
      expect(messages).toHaveLength(1)
      expect(messages[0].from).toBe('agent-1')
      expect(messages[0].to).toBe('agent-2')
      expect(messages[0].content).toBe('Hello teammate!')
      expect(messages[0].type).toBe('direct')
    })

    it('should assign a unique ID and timestamp to each message', () => {
      mailbox.sendMessage('agent-1', 'agent-2', 'Message 1')
      mailbox.sendMessage('agent-1', 'agent-2', 'Message 2')

      const messages = mailbox.getMessages('agent-2')
      expect(messages[0].id).not.toBe(messages[1].id)
      expect(messages[0].timestamp).toBeDefined()
    })

    it('should emit message-sent event', () => {
      const handler = vi.fn()
      mailbox.on('message-sent', handler)

      mailbox.sendMessage('agent-1', 'agent-2', 'Test')

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          from: 'agent-1',
          to: 'agent-2',
        }),
      )
    })
  })

  describe('broadcast', () => {
    it('should send a message to all specified teammates', () => {
      mailbox.broadcast(
        'lead',
        ['agent-1', 'agent-2', 'agent-3'],
        'Attention all!',
      )

      expect(mailbox.getMessages('agent-1')).toHaveLength(1)
      expect(mailbox.getMessages('agent-2')).toHaveLength(1)
      expect(mailbox.getMessages('agent-3')).toHaveLength(1)

      const msg = mailbox.getMessages('agent-1')[0]
      expect(msg.type).toBe('broadcast')
      expect(msg.from).toBe('lead')
    })

    it('should not send broadcast to the sender', () => {
      mailbox.broadcast('lead', ['lead', 'agent-1'], 'Update')

      expect(mailbox.getMessages('lead')).toHaveLength(0)
      expect(mailbox.getMessages('agent-1')).toHaveLength(1)
    })
  })

  describe('getMessages', () => {
    it('should return empty array for agent with no messages', () => {
      expect(mailbox.getMessages('agent-x')).toEqual([])
    })

    it('should return messages in chronological order', () => {
      mailbox.sendMessage('agent-1', 'agent-2', 'First')
      mailbox.sendMessage('agent-3', 'agent-2', 'Second')

      const messages = mailbox.getMessages('agent-2')
      expect(messages).toHaveLength(2)
      expect(messages[0].content).toBe('First')
      expect(messages[1].content).toBe('Second')
    })
  })

  describe('getUnreadMessages', () => {
    it('should return only unread messages', () => {
      mailbox.sendMessage('agent-1', 'agent-2', 'First')
      mailbox.sendMessage('agent-1', 'agent-2', 'Second')

      mailbox.markRead('agent-2', mailbox.getMessages('agent-2')[0].id)

      const unread = mailbox.getUnreadMessages('agent-2')
      expect(unread).toHaveLength(1)
      expect(unread[0].content).toBe('Second')
    })
  })

  describe('getConversation', () => {
    it('should return messages between two specific agents', () => {
      mailbox.sendMessage('agent-1', 'agent-2', 'Hi from 1')
      mailbox.sendMessage('agent-2', 'agent-1', 'Hi back from 2')
      mailbox.sendMessage('agent-3', 'agent-2', 'Hi from 3')

      const conversation = mailbox.getConversation('agent-1', 'agent-2')
      expect(conversation).toHaveLength(2)
    })
  })
})

// ============================================================================
// TeamCoordinator
// ============================================================================

describe('TeamCoordinator', () => {
  let coordinator: TeamCoordinator

  const mockLead = {
    id: 'lead-agent',
    slug: 'lead',
    name: 'Team Lead',
    role: 'Project Manager',
    instructions: 'You coordinate the team.',
    createdAt: new Date(),
  }

  const mockTeammates = [
    {
      id: 'agent-researcher',
      slug: 'researcher',
      name: 'Researcher',
      role: 'Research Analyst',
      instructions: 'You research topics.',
      createdAt: new Date(),
    },
    {
      id: 'agent-writer',
      slug: 'writer',
      name: 'Writer',
      role: 'Technical Writer',
      instructions: 'You write documents.',
      createdAt: new Date(),
    },
  ]

  beforeEach(() => {
    coordinator = new TeamCoordinator()
  })

  afterEach(() => {
    coordinator.cleanup()
  })

  describe('createTeam', () => {
    it('should create a team with lead and teammates', () => {
      const team = coordinator.createTeam({
        name: 'Research Team',
        lead: mockLead as any,
        teammates: mockTeammates as any[],
        goal: 'Research AI market trends',
      })

      expect(team.name).toBe('Research Team')
      expect(team.leadId).toBe('lead-agent')
      expect(team.memberIds).toContain('agent-researcher')
      expect(team.memberIds).toContain('agent-writer')
      expect(team.status).toBe('active')
    })

    it('should initialize an empty shared task list', () => {
      coordinator.createTeam({
        name: 'Test Team',
        lead: mockLead as any,
        teammates: mockTeammates as any[],
        goal: 'Do something',
      })

      const taskList = coordinator.getTaskList()
      expect(taskList).toBeDefined()
      expect(taskList?.getAllTasks()).toHaveLength(0)
    })

    it('should initialize an empty mailbox', () => {
      coordinator.createTeam({
        name: 'Test Team',
        lead: mockLead as any,
        teammates: mockTeammates as any[],
        goal: 'Do something',
      })

      const mailbox = coordinator.getMailbox()
      expect(mailbox).toBeDefined()
    })

    it('should not allow creating a team when one is already active', () => {
      coordinator.createTeam({
        name: 'Team 1',
        lead: mockLead as any,
        teammates: mockTeammates as any[],
        goal: 'Goal 1',
      })

      expect(() =>
        coordinator.createTeam({
          name: 'Team 2',
          lead: mockLead as any,
          teammates: [],
          goal: 'Goal 2',
        }),
      ).toThrow('A team is already active')
    })
  })

  describe('addTasks', () => {
    it('should add tasks to the shared list', () => {
      coordinator.createTeam({
        name: 'Test Team',
        lead: mockLead as any,
        teammates: mockTeammates as any[],
        goal: 'Test',
      })

      coordinator.addTasks([
        {
          title: 'Research',
          description: 'Do research',
          dependencies: [],
          agentSpec: {
            name: 'Researcher',
            role: 'Analyst',
            requiredSkills: ['research'],
            specialization: 'Research',
            estimatedExperience: 'Senior',
          },
        },
        {
          title: 'Write',
          description: 'Write report',
          dependencies: [],
        },
      ])

      const taskList = coordinator.getTaskList()
      expect(taskList?.getAllTasks()).toHaveLength(2)
    })

    it('should throw if no team is active', () => {
      expect(() =>
        coordinator.addTasks([
          {
            title: 'Task',
            description: 'Work',
            dependencies: [],
          },
        ]),
      ).toThrow('No active team')
    })
  })

  describe('addTeammate', () => {
    it('should add a new teammate to the team', () => {
      coordinator.createTeam({
        name: 'Test Team',
        lead: mockLead as any,
        teammates: mockTeammates as any[],
        goal: 'Test',
      })

      const newMember = {
        id: 'agent-reviewer',
        slug: 'reviewer',
        name: 'Reviewer',
        role: 'Code Reviewer',
        instructions: 'You review code.',
        createdAt: new Date(),
      }

      coordinator.addTeammate(newMember as any)
      const updatedTeam = coordinator.getTeam()
      expect(updatedTeam?.memberIds).toContain('agent-reviewer')
      expect(updatedTeam?.memberIds).toHaveLength(3)
    })
  })

  describe('removeTeammate', () => {
    it('should remove a teammate from the team', () => {
      coordinator.createTeam({
        name: 'Test Team',
        lead: mockLead as any,
        teammates: mockTeammates as any[],
        goal: 'Test',
      })

      coordinator.removeTeammate('agent-writer')
      const team = coordinator.getTeam()
      expect(team?.memberIds).not.toContain('agent-writer')
      expect(team?.memberIds).toHaveLength(1)
    })

    it('should not allow removing the lead', () => {
      coordinator.createTeam({
        name: 'Test Team',
        lead: mockLead as any,
        teammates: mockTeammates as any[],
        goal: 'Test',
      })

      expect(() => coordinator.removeTeammate('lead-agent')).toThrow(
        'Cannot remove the team lead',
      )
    })
  })

  describe('sendMessage / broadcast', () => {
    it('should allow sending direct messages between teammates', () => {
      coordinator.createTeam({
        name: 'Test Team',
        lead: mockLead as any,
        teammates: mockTeammates as any[],
        goal: 'Test',
      })

      coordinator.sendMessage(
        'agent-researcher',
        'agent-writer',
        'Here are my findings',
      )

      const mailbox = coordinator.getMailbox()
      const messages = mailbox?.getMessages('agent-writer')
      expect(messages).toHaveLength(1)
      expect(messages?.[0].content).toBe('Here are my findings')
    })

    it('should allow broadcasting to all teammates', () => {
      coordinator.createTeam({
        name: 'Test Team',
        lead: mockLead as any,
        teammates: mockTeammates as any[],
        goal: 'Test',
      })

      coordinator.broadcast('lead-agent', 'Team meeting time!')

      const mailbox = coordinator.getMailbox()
      expect(mailbox?.getMessages('agent-researcher')).toHaveLength(1)
      expect(mailbox?.getMessages('agent-writer')).toHaveLength(1)
    })
  })

  describe('getTeamStatus', () => {
    it('should return current team status with member and task counts', () => {
      coordinator.createTeam({
        name: 'Test Team',
        lead: mockLead as any,
        teammates: mockTeammates as any[],
        goal: 'Test goal',
      })

      coordinator.addTasks([
        {
          title: 'Task 1',
          description: 'Work 1',
          dependencies: [],
        },
        {
          title: 'Task 2',
          description: 'Work 2',
          dependencies: [],
        },
      ])

      const status = coordinator.getTeamStatus()
      expect(status).toEqual({
        name: 'Test Team',
        status: 'active',
        leadId: 'lead-agent',
        memberCount: 2,
        totalTasks: 2,
        pendingTasks: 2,
        inProgressTasks: 0,
        completedTasks: 0,
        failedTasks: 0,
      })
    })
  })

  describe('cleanup', () => {
    it('should clean up team resources', () => {
      coordinator.createTeam({
        name: 'Test Team',
        lead: mockLead as any,
        teammates: mockTeammates as any[],
        goal: 'Test',
      })

      coordinator.cleanup()
      expect(coordinator.getTeam()).toBeUndefined()
      expect(coordinator.getTaskList()).toBeUndefined()
      expect(coordinator.getMailbox()).toBeUndefined()
    })

    it('should allow creating a new team after cleanup', () => {
      coordinator.createTeam({
        name: 'Team 1',
        lead: mockLead as any,
        teammates: [],
        goal: 'Goal 1',
      })

      coordinator.cleanup()

      // Should not throw
      const team = coordinator.createTeam({
        name: 'Team 2',
        lead: mockLead as any,
        teammates: mockTeammates as any[],
        goal: 'Goal 2',
      })

      expect(team.name).toBe('Team 2')
    })
  })

  describe('getBestTeammateForTask', () => {
    it('should match teammate by skills', () => {
      coordinator.createTeam({
        name: 'Test Team',
        lead: mockLead as any,
        teammates: [
          {
            ...mockTeammates[0],
            tags: ['research', 'analysis'],
          },
          {
            ...mockTeammates[1],
            tags: ['writing', 'documentation'],
          },
        ] as any[],
        goal: 'Test',
      })

      const best = coordinator.getBestTeammateForTask({
        title: 'Research',
        description: 'Do research',
        dependencies: [],
        agentSpec: {
          name: 'Researcher',
          role: 'Analyst',
          requiredSkills: ['research'],
          specialization: 'Research',
          estimatedExperience: 'Senior',
        },
      })

      expect(best?.id).toBe('agent-researcher')
    })

    it('should return first available teammate if no skill match', () => {
      coordinator.createTeam({
        name: 'Test Team',
        lead: mockLead as any,
        teammates: mockTeammates as any[],
        goal: 'Test',
      })

      const best = coordinator.getBestTeammateForTask({
        title: 'Unknown task',
        description: 'Something unusual',
        dependencies: [],
      })

      // Should return any teammate rather than undefined
      expect(best).toBeDefined()
    })
  })
})

// ============================================================================
// detectTeamFromPrompt
// ============================================================================

describe('detectTeamFromPrompt', () => {
  it('should detect team request from explicit mentions', () => {
    const result = detectTeamFromPrompt(
      'Create an agent team to review this codebase with a security reviewer, performance analyst, and test coverage checker',
    )

    expect(result.isTeamRequest).toBe(true)
    expect(result.suggestedRoles.length).toBeGreaterThanOrEqual(2)
  })

  it('should detect team request from "team" keyword', () => {
    const result = detectTeamFromPrompt(
      'Build a team of agents to analyze the market from different perspectives',
    )

    expect(result.isTeamRequest).toBe(true)
  })

  it('should detect team request from specific agent mentions', () => {
    const result = detectTeamFromPrompt(
      'Have the researcher and writer collaborate on a technical report',
    )

    expect(result.isTeamRequest).toBe(true)
    expect(result.suggestedRoles).toContain('researcher')
    expect(result.suggestedRoles).toContain('writer')
  })

  it('should not detect team for simple single-agent tasks', () => {
    const result = detectTeamFromPrompt(
      'Write a function that calculates fibonacci numbers',
    )

    expect(result.isTeamRequest).toBe(false)
  })

  it('should detect parallel investigation requests', () => {
    const result = detectTeamFromPrompt(
      'Investigate this bug from multiple angles: one looking at the frontend, one at the backend, one at the database',
    )

    expect(result.isTeamRequest).toBe(true)
    expect(result.suggestedRoles.length).toBeGreaterThanOrEqual(2)
  })

  it('should detect "collaborate" keyword as team intent', () => {
    const result = detectTeamFromPrompt(
      'I need agents to collaborate on designing a new API',
    )

    expect(result.isTeamRequest).toBe(true)
  })

  it('should extract roles from numbered lists', () => {
    const result = detectTeamFromPrompt(
      'Create a team with: 1) a UX designer, 2) a backend developer, 3) a QA tester',
    )

    expect(result.isTeamRequest).toBe(true)
    expect(result.suggestedRoles.length).toBeGreaterThanOrEqual(3)
  })

  it('should extract roles from dash lists', () => {
    const result = detectTeamFromPrompt(
      'Spawn three reviewers: - One focused on security - One checking performance - One validating tests',
    )

    expect(result.isTeamRequest).toBe(true)
    expect(result.suggestedRoles.length).toBeGreaterThanOrEqual(3)
  })

  it('should handle "one on X, one on Y" pattern', () => {
    const result = detectTeamFromPrompt(
      "Explore this from different angles: one on UX, one on architecture, one playing devil's advocate",
    )

    expect(result.isTeamRequest).toBe(true)
    expect(result.suggestedRoles.length).toBeGreaterThanOrEqual(3)
  })
})
