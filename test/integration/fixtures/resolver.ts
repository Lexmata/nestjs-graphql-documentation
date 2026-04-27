import { Args, Field, ID, Mutation, ObjectType, Query, Resolver } from '@nestjs/graphql';

@ObjectType({ description: 'A user in the system.\n@since 1.0' })
export class User {
  @Field(() => ID)
  id!: string;

  @Field({ nullable: true, description: 'Display name.' })
  name?: string;
}

@Resolver(() => User)
export class UserResolver {
  @Query(() => User, {
    description: 'Fetch a user by id.\n@auth user\n@example\nquery { user(id: 1) { id } }',
  })
  user(@Args('id', { type: () => ID }) id: string): User {
    return { id, name: 'Jo' };
  }

  @Mutation(() => User, { description: 'Create a user.' })
  createUser(@Args('name') name: string): User {
    return { id: '1', name };
  }
}
