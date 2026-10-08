type UsersUserNameProps = {
  username: string
}

export function UsersUserName({ username }: UsersUserNameProps) {
  return <span className="text-sm text-muted-foreground">@{username}</span>
}
