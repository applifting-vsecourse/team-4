type UsersNameProps = {
  name: string
}

export function UsersName({ name }: UsersNameProps) {
  return <span className="font-semibold text-foreground">{name}</span>
}
