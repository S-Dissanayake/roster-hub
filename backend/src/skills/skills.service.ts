import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Skill } from '../entities/skill.entity';
import { CreateSkillDto } from './dto/create-skill.dto';
import { UpdateSkillDto } from './dto/update-skill.dto';

@Injectable()
export class SkillsService {
  constructor(
    @InjectRepository(Skill)
    private readonly skillRepository: Repository<Skill>,
  ) {}

  async findAll(): Promise<Skill[]> {
    return this.skillRepository.find();
  }

  async findOne(id: string): Promise<Skill> {
    const skill = await this.skillRepository.findOne({ where: { id } });
    if (!skill) {
      throw new NotFoundException(`Skill with ID '${id}' not found`);
    }
    return skill;
  }

  async create(createSkillDto: CreateSkillDto): Promise<Skill> {
    const existing = await this.skillRepository.findOne({ where: { name: createSkillDto.name } });
    if (existing) {
      throw new ConflictException(`Skill with name '${createSkillDto.name}' already exists`);
    }

    const skill = this.skillRepository.create(createSkillDto);
    try {
      return await this.skillRepository.save(skill);
    } catch (error: any) {
      // The findOne check above is racy under concurrent requests — fall back to the DB's own
      // unique constraint as the source of truth.
      if (error.code === '23505') {
        throw new ConflictException(`Skill with name '${createSkillDto.name}' already exists`);
      }
      throw error;
    }
  }

  async update(id: string, updateSkillDto: UpdateSkillDto): Promise<Skill> {
    const skill = await this.findOne(id);
    Object.assign(skill, updateSkillDto);
    return this.skillRepository.save(skill);
  }

  async remove(id: string): Promise<void> {
    const skill = await this.findOne(id);
    await this.skillRepository.remove(skill);
  }
}
