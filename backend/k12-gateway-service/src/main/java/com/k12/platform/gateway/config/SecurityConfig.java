                        .pathMatchers(HttpMethod.GET, "/api/v1/learning/courses/**").hasAnyAuthority(K12Authorities.ROLE_ADMIN, K12Authorities.COURSE_READ)
                        .pathMatchers(HttpMethod.POST, "/api/v1/learning/courses/**").hasAnyAuthority(K12Authorities.ROLE_ADMIN, K12Authorities.COURSE_CREATE)
                        .pathMatchers(HttpMethod.PUT, "/api/v1/learning/courses/**").hasAnyAuthority(K12Authorities.ROLE_ADMIN, K12Authorities.COURSE_UPDATE)
                        .pathMatchers(HttpMethod.DELETE, "/api/v1/learning/courses/**").hasAnyAuthority(K12Authorities.ROLE_ADMIN, K12Authorities.COURSE_DELETE)
                        /* 已发布课件是公开教学内容：未登录可浏览书架和打开课件，生成/发布仍仅管理员。
                         * 必须放在下面的 GET /agents/** 通配规则之前（首次匹配生效）。 */
                        .pathMatchers(HttpMethod.GET, "/api/v1/agents/courseware/published",
                                "/api/v1/agents/courseware/published/**").permitAll()
                        .pathMatchers(HttpMethod.GET, "/api/v1/agents/**").hasAnyAuthority(K12Authorities.ROLE_ADMIN, K12Authorities.AGENT_READ)
                        /* 课件生成与发布仅管理员可操作，必须先于下面的 AGENT_INVOKE 通配规则。 */
                        .pathMatchers(HttpMethod.POST, "/api/v1/agents/courseware/**").hasAuthority(K12Authorities.ROLE_ADMIN)
                        /* 运行、取消和重试都属于“调用智能体”，必须先于下面的 Agent 配置管理通配规则。 */
                        .pathMatchers(HttpMethod.POST,
                                "/api/v1/agents/*/runs",
                                "/api/v1/agents/code-executions",
                                "/api/v1/agents/speech/synthesize",
                                "/api/v1/agents/speech/recognize",
                                "/api/v1/agents/runs/*/cancel",
                                "/api/v1/agents/runs/*/retry"
                        ).hasAnyAuthority(K12Authorities.ROLE_ADMIN, K12Authorities.AGENT_INVOKE)
                        .pathMatchers(HttpMethod.POST, "/api/v1/agents/**").hasAnyAuthority(K12Authorities.ROLE_ADMIN, K12Authorities.AGENT_CREATE)
                        .pathMatchers(HttpMethod.PUT, "/api/v1/agents/**").hasAnyAuthority(K12Authorities.ROLE_ADMIN, K12Authorities.AGENT_UPDATE)
                        .pathMatchers(HttpMethod.DELETE, "/api/v1/agents/**").hasAnyAuthority(K12Authorities.ROLE_ADMIN, K12Authorities.AGENT_DELETE)